import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type InventoryTransactionType =
  | 'IN'
  | 'OUT'
  | 'ADJUSTMENT'
  | 'PRODUCTION_IN'
  | 'PRODUCTION_OUT';

export type InventoryTransactionReferenceType =
  | 'PO'
  | 'SO'
  | 'PRODUCTION'
  | 'MANUAL';

@Entity('inventory_transactions')
export class InventoryTransaction {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'part_id', type: 'char', length: 36 })
  partId: string;

  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  warehouseId: string;

  @Column({ type: 'varchar', length: 30 })
  type: InventoryTransactionType;

  @Column({ name: 'reference_type', type: 'varchar', length: 30 })
  referenceType: InventoryTransactionReferenceType;

  @Column({ name: 'reference_id', type: 'char', length: 36, nullable: true })
  referenceId: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity: string;

  @Column({ name: 'quantity_before', type: 'decimal', precision: 18, scale: 4 })
  quantityBefore: string;

  @Column({ name: 'quantity_after', type: 'decimal', precision: 18, scale: 4 })
  quantityAfter: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

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
