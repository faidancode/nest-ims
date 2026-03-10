import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { Part } from '../parts/part.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'purchase_order_id', type: 'char', length: 36 })
  purchaseOrderId: string;

  @Column({ name: 'part_id', type: 'char', length: 36 })
  partId: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  // RELASI BALIK KE PO:
  @ManyToOne(() => PurchaseOrder, (po) => po.items)
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @ManyToOne(() => Part)
  @JoinColumn({ name: 'part_id' })
  part: Part;
}
