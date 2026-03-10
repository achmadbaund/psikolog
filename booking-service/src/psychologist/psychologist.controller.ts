import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PsychologistService } from './psychologist.service';

@ApiTags('Psychologists')
@ApiBearerAuth()
@Controller('psychologists')
export class PsychologistController {
  constructor(private readonly psychologistService: PsychologistService) {}

  @Post('ingest')
  @ApiOperation({ summary: 'Ingest psychologist data from Faskes Service' })
  async ingest() {
    return this.psychologistService.ingestFromFaskesService();
  }

  @Get()
  @ApiOperation({ summary: 'List all psychologists' })
  async findAll() {
    const data = await this.psychologistService.findAll();
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get psychologist detail' })
  async findOne(@Param('id') id: string) {
    const data = await this.psychologistService.findOne(id);
    return { data };
  }
}
