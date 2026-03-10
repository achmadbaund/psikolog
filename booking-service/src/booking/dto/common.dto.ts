import { IsString, IsInt, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @IsInt()
  page?: number = 0;

  @IsOptional()
  @IsInt()
  size?: number = 20;
}

export class FindNearbyDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(50000)
  radius?: number = 5000;

  @IsOptional()
  @IsEnum(['RUMAH_SAKIT', 'PUSKESMAS', 'KLINIK', 'LABORATORIUM', 'APOTEK'])
  jenis_faskes?: string;
}
