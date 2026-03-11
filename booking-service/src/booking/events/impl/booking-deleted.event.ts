import { IEvent } from '@nestjs/cqrs';
import { BookingWrite } from '../../entities/write/booking-write.entity';

export class BookingDeletedEvent implements IEvent {
  constructor(
    public readonly bookingId: string,
    public readonly bookingData: any,
  ) {}
}
