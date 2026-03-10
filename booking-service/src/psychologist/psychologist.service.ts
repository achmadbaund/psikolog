import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Psychologist } from './entities/psychologist.entity';

@Injectable()
export class PsychologistService {
  private readonly logger = new Logger(PsychologistService.name);
  private readonly faskesServiceUrl = process.env.FASKES_SERVICE_URL || 'http://faskes-service:8009';

  constructor(
    @InjectRepository(Psychologist)
    private psychologistRepository: Repository<Psychologist>,
    private httpService: HttpService,
  ) {}

  async ingestFromFaskesService() {
    this.logger.log('Starting ingestion from Faskes Service...');

    try {
      // Get all faskes
      const faskesResponse = await firstValueFrom(
        this.httpService.get(`${this.faskesServiceUrl}/faskes`)
      );

      const faskesList = faskesResponse.data.data || [];
      this.logger.log(`Found ${faskesList.length} faskes`);

      let totalPsychologistsIngested = 0;
      let totalPsychologistsUpdated = 0;

      // Get dokter from each faskes
      for (const faskes of faskesList) {
        try {
          const dokterResponse = await firstValueFrom(
            this.httpService.get(`${this.faskesServiceUrl}/faskes/${faskes.id}/dokter`)
          );

          const dokterList = dokterResponse.data.data || [];

          for (const dokter of dokterList) {
            // Check if psychologist already exists
            const existing = await this.psychologistRepository.findOne({
              where: { id: dokter.id }
            });

            if (existing) {
              // Update existing
              await this.psychologistRepository.save({
                ...existing,
                faskesId: faskes.id,
                name: dokter.nama_dokter,
                specialization: [dokter.spesialisasi],
                kontak: dokter.kontak,
                fotoDokter: dokter.foto_dokter,
                jadwalPraktik: dokter.jadwal_praktik,
              });
              totalPsychologistsUpdated++;
            } else {
              // Create new
              const psychologist = this.psychologistRepository.create({
                id: dokter.id,
                faskesId: faskes.id,
                name: dokter.nama_dokter,
                specialization: [dokter.spesialisasi],
                rating: 4.5,
                experienceYears: 5,
                pricePerSession: 500000,
                kontak: dokter.kontak,
                fotoDokter: dokter.foto_dokter,
                jadwalPraktik: dokter.jadwal_praktik,
              });
              await this.psychologistRepository.save(psychologist);
              totalPsychologistsIngested++;
            }
          }

          this.logger.log(`Ingested ${dokterList.length} dokter from ${faskes.nama_faskes}`);
        } catch (error) {
          this.logger.error(`Failed to ingest dokter from ${faskes.nama_faskes}: ${error.message}`);
        }
      }

      this.logger.log(`Ingestion completed: ${totalPsychologistsIngested} created, ${totalPsychologistsUpdated} updated`);

      return {
        status: 'success',
        records_processed: totalPsychologistsIngested + totalPsychologistsUpdated,
        records_created: totalPsychologistsIngested,
        records_updated: totalPsychologistsUpdated,
        faskes_processed: faskesList.length,
        message: `Successfully ingested ${totalPsychologistsIngested + totalPsychologistsUpdated} psychologists from ${faskesList.length} faskes`
      };
    } catch (error) {
      this.logger.error(`Ingestion failed: ${error.message}`);
      throw error;
    }
  }

  async findAll() {
    return this.psychologistRepository.find();
  }

  async findOne(id: string) {
    const psychologist = await this.psychologistRepository.findOne({ where: { id } });
    if (!psychologist) {
      throw new Error('Psychologist not found');
    }
    return psychologist;
  }
}
