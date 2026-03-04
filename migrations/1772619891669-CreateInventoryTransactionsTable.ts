import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryTransactionsTable1772619891669 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE inventory_transactions (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        part_id CHAR(36) NOT NULL,
        warehouse_id CHAR(36) NOT NULL,
        type VARCHAR(30) NOT NULL,
        reference_type VARCHAR(30) NOT NULL,
        reference_id CHAR(36),
        quantity DECIMAL(18,4) NOT NULL,
        quantity_before DECIMAL(18,4) NOT NULL,
        quantity_after DECIMAL(18,4) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_by CHAR(36),
        updated_by CHAR(36),
        deleted_by CHAR(36),
        CONSTRAINT chk_inv_txn_type CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT', 'PRODUCTION_IN', 'PRODUCTION_OUT')),
        CONSTRAINT chk_inv_txn_reference_type CHECK (reference_type IN ('PO', 'SO', 'PRODUCTION', 'MANUAL')),
        CONSTRAINT fk_inv_txn_part_id FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT,
        CONSTRAINT fk_inv_txn_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
        CONSTRAINT fk_inv_txn_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_inv_txn_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_inv_txn_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`CREATE INDEX idx_inv_txn_part_id_warehouse_id ON inventory_transactions (part_id, warehouse_id);`);
    await queryRunner.query(`CREATE INDEX idx_inv_txn_part_id ON inventory_transactions (part_id);`);
    await queryRunner.query(`CREATE INDEX idx_inv_txn_warehouse_id ON inventory_transactions (warehouse_id);`);
    await queryRunner.query(`CREATE INDEX idx_inv_txn_type ON inventory_transactions (type);`);
    await queryRunner.query(`CREATE INDEX idx_inv_txn_reference_type ON inventory_transactions (reference_type);`);
    await queryRunner.query(`CREATE INDEX idx_inv_txn_reference_id ON inventory_transactions (reference_id);`);
    await queryRunner.query(`CREATE INDEX idx_inv_txn_deleted_at ON inventory_transactions (deleted_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_inv_txn_deleted_at ON inventory_transactions;`);
    await queryRunner.query(`DROP INDEX idx_inv_txn_reference_id ON inventory_transactions;`);
    await queryRunner.query(`DROP INDEX idx_inv_txn_reference_type ON inventory_transactions;`);
    await queryRunner.query(`DROP INDEX idx_inv_txn_type ON inventory_transactions;`);
    await queryRunner.query(`DROP INDEX idx_inv_txn_warehouse_id ON inventory_transactions;`);
    await queryRunner.query(`DROP INDEX idx_inv_txn_part_id ON inventory_transactions;`);
    await queryRunner.query(`DROP INDEX idx_inv_txn_part_id_warehouse_id ON inventory_transactions;`);
    await queryRunner.query(`DROP TABLE inventory_transactions;`);
  }
}
