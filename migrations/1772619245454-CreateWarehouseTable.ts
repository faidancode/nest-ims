import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWarehouseTable1772619245454 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "warehouses" (
                "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "name"         VARCHAR(255) NOT NULL,
                "location"     VARCHAR(500),
                "is_active"    BOOLEAN NOT NULL DEFAULT TRUE,
                "created_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "deleted_at"   TIMESTAMP WITH TIME ZONE,
                "created_by"   UUID,
                "updated_by"   UUID,
                "deleted_by"   UUID,
                CONSTRAINT "fk_warehouses_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_warehouses_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_warehouses_deleted_by" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        await queryRunner.query(`CREATE INDEX "idx_warehouses_deleted_at" ON "warehouses" ("deleted_at")`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_warehouses_deleted_at"`);
        await queryRunner.query(`DROP TABLE "warehouses"`);
    }

}
