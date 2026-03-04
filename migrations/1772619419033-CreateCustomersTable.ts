import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCustomersTable1772619419033 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "customers" (
                "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "name"         VARCHAR(255) NOT NULL,
                "contact_name" VARCHAR(255),
                "email"        VARCHAR(255),
                "phone"        VARCHAR(100),
                "address"      TEXT,
                "is_active"    BOOLEAN NOT NULL DEFAULT TRUE,
                "created_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "deleted_at"   TIMESTAMP WITH TIME ZONE,
                "created_by"   UUID,
                "updated_by"   UUID,
                "deleted_by"   UUID,
                CONSTRAINT "fk_customers_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_customers_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_customers_deleted_by" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_customers_deleted_at" ON "customers" ("deleted_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_customers_deleted_at"`);
        await queryRunner.query(`DROP TABLE "customers"`);
    }

}
