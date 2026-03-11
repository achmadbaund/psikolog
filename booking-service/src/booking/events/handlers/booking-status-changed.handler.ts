import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingStatusChangedEvent } from '../impl/booking-status-changed.event';
import { BookingRead } from '../../entities/read/booking-read.entity';
import { Logger } from '@nestjs/common';

@EventsHandler(BookingStatusChangedEvent)
export class BookingStatusChangedHandler implements IEventHandler<BookingStatusChangedEvent> {
  private readonly logger = new Logger(BookingStatusChangedHandler.name);

  constructor(
    @InjectRepository(BookingRead, 'readConnection')
    private readonly bookingReadRepository: Repository<BookingRead>,
  ) {}

  async handle(event: BookingStatusChangedEvent) {
    this.logger.log(`Handling BookingStatusChangedEvent for booking: ${event.booking.id}`);

    try {
      // Check if booking exists in read database
      let bookingRead = await this.bookingReadRepository.findOne({
        where: { id: event.booking.id },
      });

      if (!bookingRead) {
        // If not exists, create new
        bookingRead = new BookingRead();
        bookingRead.id = event.booking.id;
        bookingRead.userId = event.booking.userId;
        bookingRead.psychologistId = event.booking.psychologistId;
        bookingRead.scheduledAt = event.booking.scheduledAt;
        bookingRead.notes = event.booking.notes;
        bookingRead.createdAt = event.booking.createdAt;
      }

      // Update status and consultation notes
      bookingRead.status = event.booking.status;
      bookingRead.consultationNotes = event.booking.consultationNotes;
      bookingRead.updatedAt = event.booking.updatedAt;
      bookingRead.syncedAt = new Date();

      // Update session if exists
      if (event.booking.session) {
        const session = event.booking.session;
        bookingRead.session = {
          id: session.id,
          startTime: session.startTime,
          endTime: session.endTime,
          durationMinutes: session.durationMinutes,
          sessionType: session.sessionType,
          sessionUrl: session.sessionUrl,
          recordingUrl: session.recordingUrl,
        };
      }

      // Save to read database
      await this.bookingReadRepository.save(bookingRead);

      this.logger.log(`Booking status synced to read database: ${event.booking.id}`);
    } catch (error) {
      this.logger.error(`Failed to sync booking status to read database: ${error.message}`, error.stack);
    }
  }
}
