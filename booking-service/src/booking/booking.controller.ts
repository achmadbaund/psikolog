import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { BookingService } from './booking.service';
import { CreateBookingDto, UpdateBookingDto, CancelBookingDto } from './dto/booking.dto';
import { PaginationDto } from './dto/common.dto';

// CQRS Commands
import { CreateBookingCommand } from './commands/impl/create-booking.command';
import { UpdateBookingCommand } from './commands/impl/update-booking.command';
import { UpdateBookingStatusCommand } from './commands/impl/update-booking-status.command';

// CQRS Queries
import { GetBookingsQuery } from './queries/impl/get-bookings.query';
import { GetBookingByIdQuery } from './queries/impl/get-booking-by-id.query';

// Enums
import { BookingStatus, SessionType } from './entities/write/booking-write.entity';

@ApiTags('Psychology Bookings (CQRS + Kafka)')
@ApiBearerAuth()
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List psychology consultation bookings (CQRS Read)',
    description: `
      **CQRS Query Flow:**
      1. API Request → QueryBus
      2. QueryBus → GetBookingsHandler
      3. Handler → Read Database (MySQL:3307)
      4. Optimized for read operations with pagination & filtering

      **Query Parameters:**
      - page: Page number (default: 1)
      - limit: Items per page (default: 10)
      - userId: Filter by user ID
      - psychologistId: Filter by psychologist ID
      - status: Filter by status (PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW)
      - search: Search in notes
      - startDate: Filter by start date (ISO format)
      - endDate: Filter by end date (ISO format)
    `
  })
  @ApiResponse({ status: 200, description: 'Returns paginated list of bookings from Read DB' })
  async findAll(
    @Query() query: any,
    @Query() pagination: PaginationDto
  ) {
    const useCQRS = process.env.CQRS_ENABLED === 'true';

    if (useCQRS) {
      // CQRS Query: Read from optimized Read Database
      return this.queryBus.execute(
        new GetBookingsQuery(
          pagination.page || 1,
          10,
          query.userId,
          query.psychologistId,
          query.status as BookingStatus,
          query.search,
          query.startDate ? new Date(query.startDate) : undefined,
          query.endDate ? new Date(query.endDate) : undefined,
        ),
      );
    }

    // Legacy fallback
    return this.bookingService.findAll(query, pagination);
  }

  @Get(':bookingId')
  @ApiOperation({
    summary: 'Get booking detail (CQRS Read)',
    description: `
      **CQRS Query Flow:**
      1. API Request → QueryBus
      2. QueryBus → GetBookingByIdHandler
      3. Handler → Read Database (MySQL:3307)
      4. Returns optimized read model
    `
  })
  @ApiResponse({ status: 200, description: 'Returns booking detail from Read DB' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(@Param('bookingId') bookingId: string) {
    const useCQRS = process.env.CQRS_ENABLED === 'true';

    if (useCQRS) {
      // CQRS Query: Read from optimized Read Database
      return this.queryBus.execute(new GetBookingByIdQuery(bookingId));
    }

    // Legacy fallback
    return this.bookingService.findOne(bookingId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create new booking (CQRS Write)',
    description: `
      **CQRS Command Flow:**
      1. API Request → CommandBus
      2. CommandBus → CreateBookingHandler
      3. Handler → Write Database (MySQL:3306)
      4. Event Published → BookingCreatedEvent
      5. Event Handler → Syncs to Read Database (MySQL:3307)

      **Alternative Flow (via Kafka):**
      Faskes Service → Kafka Topic → BookingConsumer → CommandBus → Same flow

      **Request Body:**
      - psychologistId: UUID of psychologist (required)
      - scheduledAt: ISO datetime string (required)
      - durationMinutes: Session duration in minutes (default: 60, min: 30, max: 120)
      - sessionType: VIDEO, CHAT, or AUDIO (default: VIDEO)
      - notes: Optional notes (max 500 chars)
    `
  })
  @ApiResponse({ status: 201, description: 'Booking created in Write DB and synced to Read DB' })
  async create(@Body() createBookingDto: CreateBookingDto) {
    const useCQRS = process.env.CQRS_ENABLED === 'true';

    if (useCQRS) {
      // CQRS Command: Write to Write Database
      const { v4: uuidv4 } = require('uuid');
      const bookingId = uuidv4();

      const command = new CreateBookingCommand(
        bookingId,
        'default-user', // TODO: Get from auth context
        createBookingDto.psychologistId,
        new Date(createBookingDto.scheduledAt),
        createBookingDto.notes,
        createBookingDto.sessionType as SessionType,
        createBookingDto.durationMinutes || 60,
      );
      return this.commandBus.execute(command);
    }

    // Legacy fallback
    return this.bookingService.create(createBookingDto);
  }

  @Put(':bookingId')
  @ApiOperation({
    summary: 'Update booking (CQRS Write)',
    description: `
      **CQRS Command Flow:**
      1. API Request → CommandBus
      2. CommandBus → UpdateBookingHandler
      3. Handler → Write Database (MySQL:3306)
      4. Event Published → BookingUpdatedEvent
      5. Event Handler → Syncs to Read Database (MySQL:3307)

      **Request Body:**
      - scheduledAt: New scheduled datetime
      - notes: Updated notes
    `
  })
  @ApiResponse({ status: 200, description: 'Booking updated in Write DB and synced to Read DB' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async update(
    @Param('bookingId') bookingId: string,
    @Body() updateBookingDto: UpdateBookingDto
  ) {
    const useCQRS = process.env.CQRS_ENABLED === 'true';

    if (useCQRS) {
      // CQRS Command: Write to Write Database
      const command = new UpdateBookingCommand(
        bookingId,
        undefined,
        undefined,
        updateBookingDto.scheduledAt ? new Date(updateBookingDto.scheduledAt) : undefined,
        updateBookingDto.notes,
        undefined,
        undefined,
        undefined,
      );
      return this.commandBus.execute(command);
    }

    // Legacy fallback
    return this.bookingService.update(bookingId, updateBookingDto);
  }

  @Delete(':bookingId')
  @ApiOperation({
    summary: 'Cancel booking (CQRS Write)',
    description: `
      **CQRS Command Flow:**
      1. API Request → CommandBus
      2. CommandBus → UpdateBookingStatusHandler
      3. Handler → Update status in Write Database (MySQL:3306)
      4. Event Published → BookingStatusChangedEvent
      5. Event Handler → Syncs to Read Database (MySQL:3307)

      **Request Body:**
      - cancellationReason: Optional reason for cancellation
    `
  })
  @ApiResponse({ status: 200, description: 'Booking status updated to CANCELLED and synced to Read DB' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async remove(
    @Param('bookingId') bookingId: string,
    @Body() cancelDto?: CancelBookingDto
  ) {
    const useCQRS = process.env.CQRS_ENABLED === 'true';

    if (useCQRS) {
      // CQRS Command: Update status in Write Database
      const command = new UpdateBookingStatusCommand(
        bookingId,
        BookingStatus.CANCELLED,
        cancelDto?.cancellationReason,
      );
      return this.commandBus.execute(command);
    }

    // Legacy fallback
    return this.bookingService.remove(bookingId, cancelDto);
  }

  @Post(':bookingId/join')
  @ApiOperation({
    summary: 'Join video consultation session',
    description: `
      Generates/joins video consultation session for the booking.
      Uses legacy service (will be migrated to CQRS).
    `
  })
  @ApiResponse({ status: 200, description: 'Returns session URL' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async joinSession(@Param('bookingId') bookingId: string) {
    // This operation uses legacy service for now
    return this.bookingService.joinSession(bookingId);
  }
}
