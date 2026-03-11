import { ICommand } from '@nestjs/cqrs';
import { BookingStatus, SessionType } from '../../entities/write/booking-write.entity';

export class UpdateBookingCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly userId?: string,
    public readonly psychologistId?: string,
    public readonly scheduledAt?: Date,
    public readonly notes?: string,
    public readonly consultationNotes?: string,
    public readonly sessionType?: SessionType,
    public readonly durationMinutes?: number,
  ) {}
}
