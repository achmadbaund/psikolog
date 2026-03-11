import { ICommand } from '@nestjs/cqrs';
import { BookingSessionWrite, SessionType } from '../../entities/write/booking-write.entity';

export class CreateBookingCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly psychologistId: string,
    public readonly scheduledAt: Date,
    public readonly notes?: string,
    public readonly sessionType?: SessionType,
    public readonly durationMinutes?: number,
  ) {}
}
