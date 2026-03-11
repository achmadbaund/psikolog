import { ICommand } from '@nestjs/cqrs';
import { BookingStatus } from '../../entities/write/booking-write.entity';

export class UpdateBookingStatusCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly status: BookingStatus,
    public readonly reason?: string,
  ) {}
}
