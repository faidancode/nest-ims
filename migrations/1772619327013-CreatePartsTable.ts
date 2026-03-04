import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePartsTable1772619327013 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "parts" (
                "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "part_number"  VARCHAR(100) NOT NULL,
                "name"         VARCHAR(255) NOT NULL,
                "description"  TEXT,
                "type"         VARCHAR(20) NOT NULL,
                "unit"         VARCHAR(50) NOT NULL,
                "created_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "deleted_at"   TIMESTAMP WITH TIME ZONE,
                "created_by"   UUID,
                "updated_by"   UUID,
                "deleted_by"   UUID,
                CONSTRAINT "uq_parts_part_number" UNIQUE ("part_number"),
                CONSTRAINT "chk_parts_type" CHECK ("type" IN ('RAW', 'FINISHED')),
                CONSTRAINT "fk_parts_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_parts_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_parts_deleted_by" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        await queryRunner.query(`CREATE INDEX "idx_parts_type" ON "parts" ("type")`);
        await queryRunner.query(`CREATE INDEX "idx_parts_deleted_at" ON "parts" ("deleted_at")`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_parts_deleted_at"`);
        await queryRunner.query(`DROP TABLE "parts"`);
        await queryRunner.query(`DROP INDEX "idx_parts_type"`);
    }

}
