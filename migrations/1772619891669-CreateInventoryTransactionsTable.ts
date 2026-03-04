import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInventoryTransactionsTable1772619891669 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "inventory_transactions" (
                "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "part_id"          UUID NOT NULL,
                "warehouse_id"     UUID NOT NULL,
                "type"             VARCHAR(30) NOT NULL,
                "reference_type"   VARCHAR(30) NOT NULL,
                "reference_id"     UUID,
                "quantity"         NUMERIC(18,4) NOT NULL,
                "quantity_before"  NUMERIC(18,4) NOT NULL,
                "quantity_after"   NUMERIC(18,4) NOT NULL,
                "notes"            TEXT,
                "created_at"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "deleted_at"       TIMESTAMP WITH TIME ZONE,
                "created_by"       UUID,
                "updated_by"       UUID,
                "deleted_by"       UUID,
                CONSTRAINT "chk_inv_txn_type" CHECK ("type" IN ('IN', 'OUT', 'ADJUSTMENT', 'PRODUCTION_IN', 'PRODUCTION_OUT')),
                CONSTRAINT "chk_inv_txn_reference_type" CHECK ("reference_type" IN ('PO', 'SO', 'PRODUCTION', 'MANUAL')),
                CONSTRAINT "fk_inv_txn_part_id" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT,
                CONSTRAINT "fk_inv_txn_warehouse_id" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT,
                CONSTRAINT "fk_inv_txn_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_inv_txn_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_inv_txn_deleted_by" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        await queryRunner.query(`CREATE INDEX "idx_inv_txn_part_id_warehouse_id" ON "inventory_transactions" ("part_id", "warehouse_id")`);
        await queryRunner.query(`CREATE INDEX "idx_inv_txn_part_id" ON "inventory_transactions" ("part_id")`);
        await queryRunner.query(`CREATE INDEX "idx_inv_txn_warehouse_id" ON "inventory_transactions" ("warehouse_id")`);
        await queryRunner.query(`CREATE INDEX "idx_inv_txn_type" ON "inventory_transactions" ("type")`);
        await queryRunner.query(`CREATE INDEX "idx_inv_txn_reference_type" ON "inventory_transactions" ("reference_type")`);
        await queryRunner.query(`CREATE INDEX "idx_inv_txn_reference_id" ON "inventory_transactions" ("reference_id")`);
        await queryRunner.query(`CREATE INDEX "idx_inv_txn_deleted_at" ON "inventory_transactions" ("deleted_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_inv_txn_deleted_at"`);
        await queryRunner.query(`DROP INDEX "idx_inv_txn_reference_id"`);
        await queryRunner.query(`DROP INDEX "idx_inv_txn_reference_type"`);
        await queryRunner.query(`DROP INDEX "idx_inv_txn_type"`);
        await queryRunner.query(`DROP INDEX "idx_inv_txn_warehouse_id"`);
        await queryRunner.query(`DROP INDEX "idx_inv_txn_part_id"`);
        await queryRunner.query(`DROP INDEX "idx_inv_txn_part_id_warehouse_id"`);
        await queryRunner.query(`DROP TABLE "inventory_transactions"`);
    }

}
