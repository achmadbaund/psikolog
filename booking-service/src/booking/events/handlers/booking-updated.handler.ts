import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingUpdatedEvent } from '../impl/booking-updated.event';
import { BookingRead, BookingSessionRead } from '../../entities/read/booking-read.entity';
import { Logger } from '@nestjs/common';

@EventsHandler(BookingUpdatedEvent)
export class BookingUpdatedHandler implements IEventHandler<BookingUpdatedEvent> {
  private readonly logger = new Logger(BookingUpdatedHandler.name);

  constructor(
    @InjectRepository(BookingRead, 'readConnection')
    private readonly bookingReadRepository: Repository<BookingRead>,
  ) {}

  async handle(event: BookingUpdatedEvent) {
    this.logger.log(`Handling BookingUpdatedEvent for booking: ${event.booking.id}`);

    try {
      // Check if booking exists in read database
      let bookingRead = await this.bookingReadRepository.findOne({
        where: { id: event.booking.id },
      });

      if (!bookingRead) {
        // If not exists, create new
        bookingRead = new BookingRead();
        bookingRead.id = event.booking.id;
      }

      // Update fields
      bookingRead.userId = event.booking.userId;
      bookingRead.psychologistId = event.booking.psychologistId;
      bookingRead.status = event.booking.status;
      bookingRead.scheduledAt = event.booking.scheduledAt;
      bookingRead.notes = event.booking.notes;
      bookingRead.consultationNotes = event.booking.consultationNotes;
      bookingRead.updatedAt = event.booking.updatedAt;
      bookingRead.syncedAt = new Date();

      // Convert and update session
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

      this.logger.log(`Booking updated in read database: ${event.booking.id}`);
    } catch (error) {
      this.logger.error(`Failed to update booking in read database: ${error.message}`, error.stack);
    }
  }
}
