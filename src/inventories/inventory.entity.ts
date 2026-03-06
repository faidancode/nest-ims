import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('inventories')
export class Inventory {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'part_id', type: 'char', length: 36 })
  partId: string;

  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  warehouseId: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  quantity: string;

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
