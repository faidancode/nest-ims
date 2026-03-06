import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PartType = 'RAW' | 'FINISHED';

@Entity('parts')
export class Part {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'part_number', type: 'varchar', length: 100, unique: true })
  partNumber: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20 })
  type: PartType;

  @Column({ type: 'varchar', length: 50 })
  unit: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  updatedBy: string | null;

  @Column({ name: 'deleted_by', type: 'char', length: 36, nullable: true })
  deletedBy: string | null;
}
