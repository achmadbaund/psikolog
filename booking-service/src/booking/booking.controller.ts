import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto, UpdateBookingDto, CancelBookingDto } from './dto/booking.dto';
import { PaginationDto } from './dto/common.dto';

@ApiTags('Psychology Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @ApiOperation({ summary: 'List psychology consultation bookings' })
  async findAll(
    @Query() query: any,
    @Query() pagination: PaginationDto
  ) {
    return this.bookingService.findAll(query, pagination);
  }

  @Get(':bookingId')
  @ApiOperation({ summary: 'Detail psychology booking' })
  async findOne(@Param('bookingId') bookingId: string) {
    return this.bookingService.findOne(bookingId);
  }

  @Post()
  @ApiOperation({ summary: 'Buat booking konsultasi psikologi baru' })
  async create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.create(createBookingDto);
  }

  @Put(':bookingId')
  @ApiOperation({ summary: 'Update booking (reschedule)' })
  async update(
    @Param('bookingId') bookingId: string,
    @Body() updateBookingDto: UpdateBookingDto
  ) {
    return this.bookingService.update(bookingId, updateBookingDto);
  }

  @Delete(':bookingId')
  @ApiOperation({ summary: 'Cancel psychology booking' })
  async remove(
    @Param('bookingId') bookingId: string,
    @Body() cancelDto?: CancelBookingDto
  ) {
    return this.bookingService.remove(bookingId, cancelDto);
  }

  @Post(':bookingId/join')
  @ApiOperation({ summary: 'Join video consultation session' })
  async joinSession(@Param('bookingId') bookingId: string) {
    return this.bookingService.joinSession(bookingId);
  }
}
