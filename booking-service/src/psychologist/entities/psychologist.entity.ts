import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Psychologist {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ nullable: true })
  faskesId: string;

  @Column()
  name: string;

  @Column('text', { array: true })
  specialization: string[];

  @Column({ type: 'float', default: 4.5 })
  rating: number;

  @Column({ type: 'integer', default: 5 })
  experienceYears: number;

  @Column({ type: 'float', default: 500000 })
  pricePerSession: number;

  @Column({ nullable: true })
  kontak: string;

  @Column({ nullable: true })
  fotoDokter: string;

  @Column({ type: 'json', nullable: true })
  jadwalPraktik: any;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
