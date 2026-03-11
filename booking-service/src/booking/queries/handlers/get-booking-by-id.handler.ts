import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetBookingByIdQuery } from '../impl/get-booking-by-id.query';
import { BookingRead } from '../../entities/read/booking-read.entity';
import { Logger, NotFoundException } from '@nestjs/common';

@QueryHandler(GetBookingByIdQuery)
export class GetBookingByIdHandler implements IQueryHandler<GetBookingByIdQuery> {
  private readonly logger = new Logger(GetBookingByIdHandler.name);

  constructor(
    @InjectRepository(BookingRead, 'readConnection')
    private readonly bookingRepository: Repository<BookingRead>,
  ) {}

  async execute(query: GetBookingByIdQuery) {
    this.logger.log(`Executing GetBookingByIdQuery for id: ${query.id}`);

    const booking = await this.bookingRepository.findOne({
      where: { id: query.id },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${query.id} not found`);
    }

    return booking;
  }
}
