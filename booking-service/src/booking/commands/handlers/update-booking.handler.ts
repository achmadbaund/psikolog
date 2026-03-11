import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateBookingCommand } from '../impl/update-booking.command';
import { BookingWrite, BookingSessionWrite, SessionType } from '../../entities/write/booking-write.entity';
import { EventBus } from '@nestjs/cqrs';
import { BookingUpdatedEvent } from '../../events/impl/booking-updated.event';
import { Logger, NotFoundException } from '@nestjs/common';

@CommandHandler(UpdateBookingCommand)
export class UpdateBookingHandler implements ICommandHandler<UpdateBookingCommand> {
  private readonly logger = new Logger(UpdateBookingHandler.name);

  constructor(
    @InjectRepository(BookingWrite, 'writeConnection')
    private readonly bookingRepository: Repository<BookingWrite>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateBookingCommand) {
    this.logger.log(`Executing UpdateBookingCommand for booking: ${command.id}`);

    const booking = await this.bookingRepository.findOne({ where: { id: command.id } });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${command.id} not found`);
    }

    // Update fields if provided
    if (command.userId !== undefined) booking.userId = command.userId;
    if (command.psychologistId !== undefined) booking.psychologistId = command.psychologistId;
    if (command.scheduledAt !== undefined) booking.scheduledAt = command.scheduledAt;
    if (command.notes !== undefined) booking.notes = command.notes;
    if (command.consultationNotes !== undefined) booking.consultationNotes = command.consultationNotes;

    // Update session if provided
    if (command.sessionType || command.durationMinutes) {
      const session = booking.session || new BookingSessionWrite();
      if (command.sessionType) session.sessionType = command.sessionType;
      if (command.durationMinutes) {
        session.durationMinutes = command.durationMinutes;
        session.endTime = new Date(booking.scheduledAt.getTime() + command.durationMinutes * 60000);
      }
      booking.session = session;
    }

    // Save to write database
    const updatedBooking = await this.bookingRepository.save(booking);

    this.logger.log(`Booking updated successfully: ${updatedBooking.id}`);

    // Publish event for synchronization
    this.eventBus.publish(new BookingUpdatedEvent(updatedBooking));

    return updatedBooking;
  }
}
