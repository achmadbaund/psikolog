import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeleteBookingCommand } from '../impl/delete-booking.command';
import { BookingWrite } from '../../entities/write/booking-write.entity';
import { EventBus } from '@nestjs/cqrs';
import { BookingDeletedEvent } from '../../events/impl/booking-deleted.event';
import { Logger, NotFoundException } from '@nestjs/common';

@CommandHandler(DeleteBookingCommand)
export class DeleteBookingHandler implements ICommandHandler<DeleteBookingCommand> {
  private readonly logger = new Logger(DeleteBookingHandler.name);

  constructor(
    @InjectRepository(BookingWrite, 'writeConnection')
    private readonly bookingRepository: Repository<BookingWrite>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DeleteBookingCommand) {
    this.logger.log(`Executing DeleteBookingCommand for booking: ${command.id}`);

    const booking = await this.bookingRepository.findOne({ where: { id: command.id } });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${command.id} not found`);
    }

    // Store booking data before deletion for event
    const bookingData = { ...booking };

    // Delete from write database
    await this.bookingRepository.remove(booking);

    this.logger.log(`Booking deleted: ${command.id}`);

    // Publish event for synchronization
    this.eventBus.publish(new BookingDeletedEvent(command.id, bookingData));

    return { id: command.id, deleted: true };
  }
}
