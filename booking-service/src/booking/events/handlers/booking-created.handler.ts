import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingCreatedEvent } from '../impl/booking-created.event';
import { BookingRead, BookingSessionRead } from '../../entities/read/booking-read.entity';
import { Logger } from '@nestjs/common';

@EventsHandler(BookingCreatedEvent)
export class BookingCreatedHandler implements IEventHandler<BookingCreatedEvent> {
  private readonly logger = new Logger(BookingCreatedHandler.name);

  constructor(
    @InjectRepository(BookingRead, 'readConnection')
    private readonly bookingReadRepository: Repository<BookingRead>,
  ) {}

  async handle(event: BookingCreatedEvent) {
    this.logger.log(`Handling BookingCreatedEvent for booking: ${event.booking.id}`);

    try {
      // Convert write entity to read entity
      const bookingRead = new BookingRead();
      bookingRead.id = event.booking.id;
      bookingRead.userId = event.booking.userId;
      bookingRead.psychologistId = event.booking.psychologistId;
      bookingRead.status = event.booking.status;
      bookingRead.scheduledAt = event.booking.scheduledAt;
      bookingRead.notes = event.booking.notes;
      bookingRead.consultationNotes = event.booking.consultationNotes;
      bookingRead.createdAt = event.booking.createdAt;
      bookingRead.updatedAt = event.booking.updatedAt;
      bookingRead.syncedAt = new Date();

      // Convert session
      if (event.booking.session) {
        const session = new BookingSessionRead();
        session.id = event.booking.session.id;
        session.startTime = event.booking.session.startTime;
        session.endTime = event.booking.session.endTime;
        session.durationMinutes = event.booking.session.durationMinutes;
        session.sessionType = event.booking.session.sessionType;
        session.sessionUrl = event.booking.session.sessionUrl;
        session.recordingUrl = event.booking.session.recordingUrl;
        bookingRead.session = session;
      }

      // Save to read database
      await this.bookingReadRepository.save(bookingRead);

      this.logger.log(`Booking synced to read database: ${event.booking.id}`);
    } catch (error) {
      this.logger.error(`Failed to sync booking to read database: ${error.message}`, error.stack);
    }
  }
}
