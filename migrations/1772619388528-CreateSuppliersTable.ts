import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSuppliersTable1772619388528 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE suppliers (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(100),
        address TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_by CHAR(36),
        updated_by CHAR(36),
        deleted_by CHAR(36),
        CONSTRAINT fk_suppliers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_suppliers_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_suppliers_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`CREATE INDEX idx_suppliers_deleted_at ON suppliers (deleted_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_suppliers_deleted_at ON suppliers;`);
    await queryRunner.query(`DROP TABLE suppliers;`);
  }
}
