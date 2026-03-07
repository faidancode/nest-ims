import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export type AuditLogAction =
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'STATUS_CHANGE';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'user_id', type: 'char', length: 36, nullable: true })
  userId: string | null;

  @Column({ name: 'table_name', type: 'varchar', length: 100 })
  tableName: string;

  @Column({ name: 'record_id', type: 'char', length: 36 })
  recordId: string;

  @Column({ type: 'varchar', length: 30 })
  action: AuditLogAction;

  @Column({ name: 'old_values', type: 'json', nullable: true })
  oldValues: Record<string, unknown> | null;

  @Column({ name: 'new_values', type: 'json', nullable: true })
  newValues: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

