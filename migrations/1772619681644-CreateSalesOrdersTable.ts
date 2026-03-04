import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSalesOrdersTable1772619681644 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "sales_orders" (
                "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "so_number"      VARCHAR(100) NOT NULL,
                "customer_id"    UUID NOT NULL,
                "status"         VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
                "order_date"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "expected_date"  TIMESTAMP WITH TIME ZONE,
                "notes"          TEXT,
                "created_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "deleted_at"     TIMESTAMP WITH TIME ZONE,
                "created_by"     UUID,
                "updated_by"     UUID,
                "deleted_by"     UUID,
                "approved_by"    UUID,
                CONSTRAINT "uq_sales_orders_so_number" UNIQUE ("so_number"),
                CONSTRAINT "chk_sales_orders_status" CHECK ("status" IN ('DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
                CONSTRAINT "fk_sales_orders_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT,
                CONSTRAINT "fk_sales_orders_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_sales_orders_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_sales_orders_deleted_by" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_sales_orders_approved_by" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "sales_order_items" (
                "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "sales_order_id" UUID NOT NULL,
                "part_id"        UUID NOT NULL,
                "quantity"       NUMERIC(18,4) NOT NULL,
                "unit_price"     NUMERIC(18,4) NOT NULL,
                "created_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "deleted_at"     TIMESTAMP WITH TIME ZONE,
                "created_by"     UUID,
                "updated_by"     UUID,
                "deleted_by"     UUID,
                CONSTRAINT "fk_so_items_sales_order_id" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_so_items_part_id" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT,
                CONSTRAINT "fk_so_items_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_so_items_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_so_items_deleted_by" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        // Indexes: sales_orders
        await queryRunner.query(`CREATE INDEX "idx_sales_orders_customer_id" ON "sales_orders" ("customer_id")`);
        await queryRunner.query(`CREATE INDEX "idx_sales_orders_status" ON "sales_orders" ("status")`);
        await queryRunner.query(`CREATE INDEX "idx_sales_orders_order_date" ON "sales_orders" ("order_date")`);
        await queryRunner.query(`CREATE INDEX "idx_sales_orders_deleted_at" ON "sales_orders" ("deleted_at")`);

        // Indexes: sales_order_items
        await queryRunner.query(`CREATE INDEX "idx_so_items_sales_order_id" ON "sales_order_items" ("sales_order_id")`);
        await queryRunner.query(`CREATE INDEX "idx_so_items_part_id" ON "sales_order_items" ("part_id")`);
        await queryRunner.query(`CREATE INDEX "idx_so_items_deleted_at" ON "sales_order_items" ("deleted_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_so_items_deleted_at"`);
        await queryRunner.query(`DROP INDEX "idx_so_items_part_id"`);
        await queryRunner.query(`DROP INDEX "idx_so_items_sales_order_id"`);
        await queryRunner.query(`DROP TABLE "sales_order_items"`);
        await queryRunner.query(`DROP INDEX "idx_sales_orders_deleted_at"`);
        await queryRunner.query(`DROP INDEX "idx_sales_orders_order_date"`);
        await queryRunner.query(`DROP INDEX "idx_sales_orders_status"`);
        await queryRunner.query(`DROP INDEX "idx_sales_orders_customer_id"`);
        await queryRunner.query(`DROP TABLE "sales_orders"`);
    }

}
