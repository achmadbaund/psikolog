import { IEvent } from '@nestjs/cqrs';
import { BookingWrite } from '../../entities/write/booking-write.entity';

export class BookingCreatedEvent implements IEvent {
  constructor(
    public readonly booking: BookingWrite,
  ) {}
}
