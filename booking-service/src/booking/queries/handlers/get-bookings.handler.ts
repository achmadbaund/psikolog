import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetBookingsQuery } from '../impl/get-bookings.query';
import { BookingRead } from '../../entities/read/booking-read.entity';
import { Logger } from '@nestjs/common';

@QueryHandler(GetBookingsQuery)
export class GetBookingsHandler implements IQueryHandler<GetBookingsQuery> {
  private readonly logger = new Logger(GetBookingsHandler.name);

  constructor(
    @InjectRepository(BookingRead, 'readConnection')
    private readonly bookingRepository: Repository<BookingRead>,
  ) {}

  async execute(query: GetBookingsQuery) {
    this.logger.log(`Executing GetBookingsQuery`);

    const { page, limit, userId, psychologistId, status, search, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    // Build query builder
    const qb = this.bookingRepository.createQueryBuilder('booking');

    // Filter by user ID
    if (userId) {
      qb.andWhere('booking.userId = :userId', { userId });
    }

    // Filter by psychologist ID
    if (psychologistId) {
      qb.andWhere('booking.psychologistId = :psychologistId', { psychologistId });
    }

    // Filter by status
    if (status) {
      qb.andWhere('booking.status = :status', { status });
    }

    // Filter by date range
    if (startDate) {
      qb.andWhere('booking.scheduledAt >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('booking.scheduledAt <= :endDate', { endDate });
    }

    // Search in notes
    if (search) {
      qb.andWhere('(booking.notes LIKE :search OR booking.consultationNotes LIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Count total before pagination
    const total = await qb.getCount();

    // Apply pagination
    qb.skip(skip).take(limit);

    // Order by scheduled date descending
    qb.orderBy('booking.scheduledAt', 'DESC');

    // Execute query
    const bookings = await qb.getMany();

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
