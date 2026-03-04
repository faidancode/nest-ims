import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWarehouseTable1772619245454 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE warehouses (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        location VARCHAR(500),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_by CHAR(36),
        updated_by CHAR(36),
        deleted_by CHAR(36),
        CONSTRAINT fk_warehouses_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_warehouses_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_warehouses_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`CREATE INDEX idx_warehouses_deleted_at ON warehouses (deleted_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_warehouses_deleted_at ON warehouses;`);
    await queryRunner.query(`DROP TABLE warehouses;`);
  }
}
