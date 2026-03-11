import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { CqrsModule } from '@nestjs/cqrs';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { Booking, BookingSession } from './entities/booking.entity';

// CQRS Entities
import { BookingWrite } from './entities/write/booking-write.entity';
import { BookingRead } from './entities/read/booking-read.entity';

// Command Handlers
import { CreateBookingHandler } from './commands/handlers/create-booking.handler';
import { UpdateBookingHandler } from './commands/handlers/update-booking.handler';
import { UpdateBookingStatusHandler } from './commands/handlers/update-booking-status.handler';
import { DeleteBookingHandler } from './commands/handlers/delete-booking.handler';

// Query Handlers
import { GetBookingsHandler } from './queries/handlers/get-bookings.handler';
import { GetBookingByIdHandler } from './queries/handlers/get-booking-by-id.handler';
import { GetBookingsByUserIdHandler } from './queries/handlers/get-bookings-by-user-id.handler';
import { GetBookingsByPsychologistIdHandler } from './queries/handlers/get-bookings-by-psychologist-id.handler';

// Event Handlers
import { BookingCreatedHandler } from './events/handlers/booking-created.handler';
import { BookingUpdatedHandler } from './events/handlers/booking-updated.handler';
import { BookingStatusChangedHandler } from './events/handlers/booking-status-changed.handler';
import { BookingDeletedHandler } from './events/handlers/booking-deleted.handler';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([Booking, BookingSession]), // Legacy support
    TypeOrmModule.forFeature([BookingWrite], 'writeConnection'), // CQRS Write
    TypeOrmModule.forFeature([BookingRead], 'readConnection'), // CQRS Read
    HttpModule,
  ],
  controllers: [BookingController],
  providers: [
    BookingService,
    // Command Handlers
    CreateBookingHandler,
    UpdateBookingHandler,
    UpdateBookingStatusHandler,
    DeleteBookingHandler,
    // Query Handlers
    GetBookingsHandler,
    GetBookingByIdHandler,
    GetBookingsByUserIdHandler,
    GetBookingsByPsychologistIdHandler,
    // Event Handlers
    BookingCreatedHandler,
    BookingUpdatedHandler,
    BookingStatusChangedHandler,
    BookingDeletedHandler,
  ],
  exports: [BookingService, CqrsModule],
})
export class BookingModule {}
