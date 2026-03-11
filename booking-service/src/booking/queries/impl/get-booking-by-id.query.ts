import { IQuery } from '@nestjs/cqrs';

export class GetBookingByIdQuery implements IQuery {
  constructor(
    public readonly id: string,
  ) {}
}
