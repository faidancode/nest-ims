import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('bill_of_materials')
export class BillOfMaterial {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'finished_part_id', type: 'char', length: 36 })
  finishedPartId: string;

  @Column({ name: 'raw_part_id', type: 'char', length: 36 })
  rawPartId: string;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity: string;

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

