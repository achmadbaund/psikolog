import { IEvent } from '@nestjs/cqrs';
import { BookingWrite, BookingStatus } from '../../entities/write/booking-write.entity';

export class BookingStatusChangedEvent implements IEvent {
  constructor(
    public readonly booking: BookingWrite,
    public readonly oldStatus: BookingStatus,
  ) {}
}
