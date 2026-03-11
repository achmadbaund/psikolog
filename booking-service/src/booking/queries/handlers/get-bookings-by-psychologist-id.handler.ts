import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetBookingsByPsychologistIdQuery } from '../impl/get-bookings-by-psychologist-id.query';
import { BookingRead } from '../../entities/read/booking-read.entity';
import { Logger } from '@nestjs/common';

@QueryHandler(GetBookingsByPsychologistIdQuery)
export class GetBookingsByPsychologistIdHandler implements IQueryHandler<GetBookingsByPsychologistIdQuery> {
  private readonly logger = new Logger(GetBookingsByPsychologistIdHandler.name);

  constructor(
    @InjectRepository(BookingRead, 'readConnection')
    private readonly bookingRepository: Repository<BookingRead>,
  ) {}

  async execute(query: GetBookingsByPsychologistIdQuery) {
    this.logger.log(`Executing GetBookingsByPsychologistIdQuery for psychologistId: ${query.psychologistId}`);

    const { psychologistId, page, limit, status } = query;
    const skip = (page - 1) * limit;

    // Build query builder
    const qb = this.bookingRepository.createQueryBuilder('booking');

    // Filter by psychologist ID
    qb.andWhere('booking.psychologistId = :psychologistId', { psychologistId });

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
