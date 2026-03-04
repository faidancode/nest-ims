import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1772619935045 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id CHAR(36),
        table_name VARCHAR(100) NOT NULL,
        record_id CHAR(36) NOT NULL,
        action VARCHAR(30) NOT NULL,
        old_values JSON,
        new_values JSON,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_audit_logs_action CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'STATUS_CHANGE')),
        CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`CREATE INDEX idx_audit_logs_table_name_record_id ON audit_logs (table_name, record_id);`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_table_name ON audit_logs (table_name);`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_record_id ON audit_logs (record_id);`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_action ON audit_logs (action);`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_audit_logs_created_at ON audit_logs;`);
    await queryRunner.query(`DROP INDEX idx_audit_logs_action ON audit_logs;`);
    await queryRunner.query(`DROP INDEX idx_audit_logs_record_id ON audit_logs;`);
    await queryRunner.query(`DROP INDEX idx_audit_logs_table_name ON audit_logs;`);
    await queryRunner.query(`DROP INDEX idx_audit_logs_user_id ON audit_logs;`);
    await queryRunner.query(`DROP INDEX idx_audit_logs_table_name_record_id ON audit_logs;`);
    await queryRunner.query(`DROP TABLE audit_logs;`);
  }
}
