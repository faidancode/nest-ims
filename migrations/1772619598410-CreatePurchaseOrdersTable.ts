import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchaseOrdersTable1772619598410 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE purchase_orders (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        po_number VARCHAR(100) NOT NULL,
        supplier_id CHAR(36) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expected_date TIMESTAMP NULL DEFAULT NULL,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_by CHAR(36),
        updated_by CHAR(36),
        deleted_by CHAR(36),
        approved_by CHAR(36),
        CONSTRAINT uq_purchase_orders_po_number UNIQUE (po_number),
        CONSTRAINT chk_purchase_orders_status CHECK (status IN ('DRAFT', 'RECEIVED')),
        CONSTRAINT fk_purchase_orders_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
        CONSTRAINT fk_purchase_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_purchase_orders_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_purchase_orders_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_purchase_orders_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE purchase_order_items (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        purchase_order_id CHAR(36) NOT NULL,
        part_id CHAR(36) NOT NULL,
        quantity DECIMAL(18,4) NOT NULL,
        unit_price DECIMAL(18,4) NOT NULL,
        received_qty DECIMAL(18,4) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_by CHAR(36),
        updated_by CHAR(36),
        deleted_by CHAR(36),
        CONSTRAINT fk_po_items_purchase_order_id FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_po_items_part_id FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT,
        CONSTRAINT fk_po_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_po_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_po_items_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders (supplier_id);`);
    await queryRunner.query(`CREATE INDEX idx_purchase_orders_status ON purchase_orders (status);`);
    await queryRunner.query(`CREATE INDEX idx_purchase_orders_order_date ON purchase_orders (order_date);`);
    await queryRunner.query(`CREATE INDEX idx_purchase_orders_deleted_at ON purchase_orders (deleted_at);`);

    await queryRunner.query(`CREATE INDEX idx_po_items_purchase_order_id ON purchase_order_items (purchase_order_id);`);
    await queryRunner.query(`CREATE INDEX idx_po_items_part_id ON purchase_order_items (part_id);`);
    await queryRunner.query(`CREATE INDEX idx_po_items_deleted_at ON purchase_order_items (deleted_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_po_items_deleted_at ON purchase_order_items;`);
    await queryRunner.query(`DROP INDEX idx_po_items_part_id ON purchase_order_items;`);
    await queryRunner.query(`DROP INDEX idx_po_items_purchase_order_id ON purchase_order_items;`);
    await queryRunner.query(`DROP TABLE purchase_order_items;`);

    await queryRunner.query(`DROP INDEX idx_purchase_orders_deleted_at ON purchase_orders;`);
    await queryRunner.query(`DROP INDEX idx_purchase_orders_order_date ON purchase_orders;`);
    await queryRunner.query(`DROP INDEX idx_purchase_orders_status ON purchase_orders;`);
    await queryRunner.query(`DROP INDEX idx_purchase_orders_supplier_id ON purchase_orders;`);
    await queryRunner.query(`DROP TABLE purchase_orders;`);
  }
}
