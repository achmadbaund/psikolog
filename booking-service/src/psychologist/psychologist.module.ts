import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Psychologist } from './entities/psychologist.entity';
import { PsychologistService } from './psychologist.service';
import { PsychologistController } from './psychologist.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Psychologist]),
    HttpModule,
  ],
  providers: [PsychologistService],
  controllers: [PsychologistController],
  exports: [PsychologistService],
})
export class PsychologistModule {}
