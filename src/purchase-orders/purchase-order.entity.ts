import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PurchaseOrderStatus = 'DRAFT' | 'RECEIVED';

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'po_number', type: 'varchar', length: 100, unique: true })
  poNumber: string;

  @Column({ name: 'supplier_id', type: 'char', length: 36 })
  supplierId: string;

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status: PurchaseOrderStatus;

  @Column({ name: 'order_date', type: 'timestamp' })
  orderDate: Date;

  @Column({ name: 'expected_date', type: 'timestamp', nullable: true })
  expectedDate: Date | null;

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

  @Column({ name: 'approved_by', type: 'char', length: 36, nullable: true })
  approvedBy: string | null;
}
