import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SalesOrderStatus = 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

@Entity('sales_orders')
export class SalesOrder {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'so_number', type: 'varchar', length: 100, unique: true })
  soNumber: string;

  @Column({ name: 'customer_id', type: 'char', length: 36 })
  customerId: string;

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status: SalesOrderStatus;

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
