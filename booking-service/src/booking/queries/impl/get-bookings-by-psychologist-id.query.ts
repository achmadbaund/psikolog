import { IQuery } from '@nestjs/cqrs';
import { BookingStatus } from '../../entities/read/booking-read.entity';

export class GetBookingsByPsychologistIdQuery implements IQuery {
  constructor(
    public readonly psychologistId: string,
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly status?: BookingStatus,
  ) {}
}
