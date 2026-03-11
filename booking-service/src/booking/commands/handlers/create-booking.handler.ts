import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBookingCommand } from '../impl/create-booking.command';
import { BookingWrite, BookingSessionWrite, SessionType } from '../../entities/write/booking-write.entity';
import { EventBus } from '@nestjs/cqrs';
import { BookingCreatedEvent } from '../../events/impl/booking-created.event';
import { Logger } from '@nestjs/common';

@CommandHandler(CreateBookingCommand)
export class CreateBookingHandler implements ICommandHandler<CreateBookingCommand> {
  private readonly logger = new Logger(CreateBookingHandler.name);

  constructor(
    @InjectRepository(BookingWrite, 'writeConnection')
    private readonly bookingRepository: Repository<BookingWrite>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateBookingCommand) {
    this.logger.log(`Executing CreateBookingCommand for booking: ${command.id}`);

    const {
      id,
      userId,
      psychologistId,
      scheduledAt,
      notes,
      sessionType = SessionType.VIDEO,
      durationMinutes = 60,
    } = command;

    // Create session
    const session = new BookingSessionWrite();
    session.id = id;
    session.startTime = scheduledAt;
    session.endTime = new Date(scheduledAt.getTime() + durationMinutes * 60000);
    session.durationMinutes = durationMinutes;
    session.sessionType = sessionType;

    // Create booking
    const booking = new BookingWrite();
    booking.id = id;
    booking.userId = userId;
    booking.psychologistId = psychologistId;
    booking.scheduledAt = scheduledAt;
    booking.notes = notes || `Booking for psychologist ${psychologistId}`;
    booking.status = 'PENDING' as any;
    booking.session = session;

    // Save to write database
    const savedBooking = await this.bookingRepository.save(booking);

    this.logger.log(`Booking created successfully: ${savedBooking.id}`);

    // Publish event for synchronization
    this.eventBus.publish(new BookingCreatedEvent(savedBooking));

    return savedBooking;
  }
}
