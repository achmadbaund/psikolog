import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingDeletedEvent } from '../impl/booking-deleted.event';
import { BookingRead } from '../../entities/read/booking-read.entity';
import { Logger } from '@nestjs/common';

@EventsHandler(BookingDeletedEvent)
export class BookingDeletedHandler implements IEventHandler<BookingDeletedEvent> {
  private readonly logger = new Logger(BookingDeletedHandler.name);

  constructor(
    @InjectRepository(BookingRead, 'readConnection')
    private readonly bookingReadRepository: Repository<BookingRead>,
  ) {}

  async handle(event: BookingDeletedEvent) {
    this.logger.log(`Handling BookingDeletedEvent for booking: ${event.bookingId}`);

    try {
      // Check if booking exists in read database
      const bookingRead = await this.bookingReadRepository.findOne({
        where: { id: event.bookingId },
      });

      if (bookingRead) {
        // Delete from read database
        await this.bookingReadRepository.remove(bookingRead);
        this.logger.log(`Booking deleted from read database: ${event.bookingId}`);
      } else {
        this.logger.warn(`Booking not found in read database: ${event.bookingId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete booking from read database: ${error.message}`, error.stack);
    }
  }
}
