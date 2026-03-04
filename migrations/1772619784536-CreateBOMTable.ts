import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBOMTable1772619784536 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "bill_of_materials" (
                "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "finished_part_id" UUID NOT NULL,
                "raw_part_id"      UUID NOT NULL,
                "quantity"         NUMERIC(18,4) NOT NULL,
                "unit"             VARCHAR(50) NOT NULL,
                "created_at"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "deleted_at"       TIMESTAMP WITH TIME ZONE,
                "created_by"       UUID,
                "updated_by"       UUID,
                "deleted_by"       UUID,
                CONSTRAINT "uq_bom_finished_raw" UNIQUE ("finished_part_id", "raw_part_id"),
                CONSTRAINT "fk_bom_finished_part_id" FOREIGN KEY ("finished_part_id") REFERENCES "parts"("id") ON DELETE RESTRICT,
                CONSTRAINT "fk_bom_raw_part_id" FOREIGN KEY ("raw_part_id") REFERENCES "parts"("id") ON DELETE RESTRICT,
                CONSTRAINT "fk_bom_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_bom_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_bom_deleted_by" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        await queryRunner.query(`CREATE INDEX "idx_bom_finished_part_id" ON "bill_of_materials" ("finished_part_id")`);
        await queryRunner.query(`CREATE INDEX "idx_bom_raw_part_id" ON "bill_of_materials" ("raw_part_id")`);
        await queryRunner.query(`CREATE INDEX "idx_bom_deleted_at" ON "bill_of_materials" ("deleted_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_bom_deleted_at"`);
        await queryRunner.query(`DROP INDEX "idx_bom_raw_part_id"`);
        await queryRunner.query(`DROP INDEX "idx_bom_finished_part_id"`);
        await queryRunner.query(`DROP TABLE "bill_of_materials"`);
    }

}
