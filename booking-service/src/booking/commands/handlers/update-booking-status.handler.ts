import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateBookingStatusCommand } from '../impl/update-booking-status.command';
import { BookingWrite } from '../../entities/write/booking-write.entity';
import { EventBus } from '@nestjs/cqrs';
import { BookingStatusChangedEvent } from '../../events/impl/booking-status-changed.event';
import { Logger, NotFoundException } from '@nestjs/common';

@CommandHandler(UpdateBookingStatusCommand)
export class UpdateBookingStatusHandler implements ICommandHandler<UpdateBookingStatusCommand> {
  private readonly logger = new Logger(UpdateBookingStatusHandler.name);

  constructor(
    @InjectRepository(BookingWrite, 'writeConnection')
    private readonly bookingRepository: Repository<BookingWrite>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateBookingStatusCommand) {
    this.logger.log(`Executing UpdateBookingStatusCommand for booking: ${command.id}`);

    const booking = await this.bookingRepository.findOne({ where: { id: command.id } });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${command.id} not found`);
    }

    const oldStatus = booking.status;
    booking.status = command.status as any;

    // Add consultation notes if provided
    if (command.reason) {
      booking.consultationNotes = command.reason;
    }

    // Save to write database
    const updatedBooking = await this.bookingRepository.save(booking);

    this.logger.log(`Booking status updated: ${oldStatus} -> ${command.status}`);

    // Publish event for synchronization
    this.eventBus.publish(new BookingStatusChangedEvent(updatedBooking, oldStatus));

    return updatedBooking;
  }
}
