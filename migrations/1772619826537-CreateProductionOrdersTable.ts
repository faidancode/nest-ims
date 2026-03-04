import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductionOrdersTable1772619826537 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE production_orders (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        po_number VARCHAR(100) NOT NULL,
        finished_part_id CHAR(36) NOT NULL,
        warehouse_id CHAR(36) NOT NULL,
        quantity DECIMAL(18,4) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        production_date TIMESTAMP NULL DEFAULT NULL,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_by CHAR(36),
        updated_by CHAR(36),
        deleted_by CHAR(36),
        approved_by CHAR(36),
        CONSTRAINT uq_production_orders_po_number UNIQUE (po_number),
        CONSTRAINT chk_production_orders_status CHECK (status IN ('DRAFT', 'COMPLETED')),
        CONSTRAINT fk_production_orders_finished_part_id FOREIGN KEY (finished_part_id) REFERENCES parts(id) ON DELETE RESTRICT,
        CONSTRAINT fk_production_orders_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
        CONSTRAINT fk_production_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_production_orders_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_production_orders_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_production_orders_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`CREATE INDEX idx_production_orders_finished_part_id ON production_orders (finished_part_id);`);
    await queryRunner.query(`CREATE INDEX idx_production_orders_warehouse_id ON production_orders (warehouse_id);`);
    await queryRunner.query(`CREATE INDEX idx_production_orders_status ON production_orders (status);`);
    await queryRunner.query(`CREATE INDEX idx_production_orders_production_date ON production_orders (production_date);`);
    await queryRunner.query(`CREATE INDEX idx_production_orders_deleted_at ON production_orders (deleted_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_production_orders_deleted_at ON production_orders;`);
    await queryRunner.query(`DROP INDEX idx_production_orders_production_date ON production_orders;`);
    await queryRunner.query(`DROP INDEX idx_production_orders_status ON production_orders;`);
    await queryRunner.query(`DROP INDEX idx_production_orders_warehouse_id ON production_orders;`);
    await queryRunner.query(`DROP INDEX idx_production_orders_finished_part_id ON production_orders;`);
    await queryRunner.query(`DROP TABLE production_orders;`);
  }
}
