import { IQuery } from '@nestjs/cqrs';
import { BookingStatus } from '../../entities/read/booking-read.entity';

export class GetBookingsQuery implements IQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly userId?: string,
    public readonly psychologistId?: string,
    public readonly status?: BookingStatus,
    public readonly search?: string,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
  ) {}
}
