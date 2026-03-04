import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoriesTable1772619545438 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE inventories (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        part_id CHAR(36) NOT NULL,
        warehouse_id CHAR(36) NOT NULL,
        quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_by CHAR(36),
        updated_by CHAR(36),
        deleted_by CHAR(36),
        CONSTRAINT uq_inventories_part_warehouse UNIQUE (part_id, warehouse_id),
        CONSTRAINT fk_inventories_part_id FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT,
        CONSTRAINT fk_inventories_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
        CONSTRAINT fk_inventories_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_inventories_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_inventories_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`CREATE INDEX idx_inventories_part_id ON inventories (part_id);`);
    await queryRunner.query(`CREATE INDEX idx_inventories_warehouse_id ON inventories (warehouse_id);`);
    await queryRunner.query(`CREATE INDEX idx_inventories_deleted_at ON inventories (deleted_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_inventories_deleted_at ON inventories;`);
    await queryRunner.query(`DROP INDEX idx_inventories_warehouse_id ON inventories;`);
    await queryRunner.query(`DROP INDEX idx_inventories_part_id ON inventories;`);
    await queryRunner.query(`DROP TABLE inventories;`);
  }
}
