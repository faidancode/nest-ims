import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInventoriesTable1772619545438 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "inventories" (
                "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "part_id"        UUID NOT NULL,
                "warehouse_id"   UUID NOT NULL,
                "quantity"       NUMERIC(18,4) NOT NULL DEFAULT 0,
                "created_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "deleted_at"     TIMESTAMP WITH TIME ZONE,
                "created_by"     UUID,
                "updated_by"     UUID,
                "deleted_by"     UUID,
                CONSTRAINT "uq_inventories_part_warehouse" UNIQUE ("part_id", "warehouse_id"),
                CONSTRAINT "fk_inventories_part_id" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT,
                CONSTRAINT "fk_inventories_warehouse_id" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT,
                CONSTRAINT "fk_inventories_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_inventories_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_inventories_deleted_by" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        await queryRunner.query(`CREATE INDEX "idx_inventories_part_id" ON "inventories" ("part_id")`);
        await queryRunner.query(`CREATE INDEX "idx_inventories_warehouse_id" ON "inventories" ("warehouse_id")`);
        await queryRunner.query(`CREATE INDEX "idx_inventories_deleted_at" ON "inventories" ("deleted_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_inventories_deleted_at"`);
        await queryRunner.query(`DROP INDEX "idx_inventories_warehouse_id"`);
        await queryRunner.query(`DROP INDEX "idx_inventories_part_id"`);
        await queryRunner.query(`DROP TABLE "inventories"`);
    }

}
