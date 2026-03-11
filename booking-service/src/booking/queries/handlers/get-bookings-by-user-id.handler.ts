import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetBookingsByUserIdQuery } from '../impl/get-bookings-by-user-id.query';
import { BookingRead } from '../../entities/read/booking-read.entity';
import { Logger } from '@nestjs/common';

@QueryHandler(GetBookingsByUserIdQuery)
export class GetBookingsByUserIdHandler implements IQueryHandler<GetBookingsByUserIdQuery> {
  private readonly logger = new Logger(GetBookingsByUserIdHandler.name);

  constructor(
    @InjectRepository(BookingRead, 'readConnection')
    private readonly bookingRepository: Repository<BookingRead>,
  ) {}

  async execute(query: GetBookingsByUserIdQuery) {
    this.logger.log(`Executing GetBookingsByUserIdQuery for userId: ${query.userId}`);

    const { userId, page, limit, status } = query;
    const skip = (page - 1) * limit;

    // Build query builder
    const qb = this.bookingRepository.createQueryBuilder('booking');

    // Filter by user ID
    qb.andWhere('booking.userId = :userId', { userId });

    // Filter by status if provided
    if (status) {
      qb.andWhere('booking.status = :status', { status });
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
