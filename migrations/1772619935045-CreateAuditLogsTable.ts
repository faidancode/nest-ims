import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuditLogsTable1772619935045 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "audit_logs" (
                "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id"      UUID,
                "table_name"   VARCHAR(100) NOT NULL,
                "record_id"    UUID NOT NULL,
                "action"       VARCHAR(30) NOT NULL,
                "old_values"   JSONB,
                "new_values"   JSONB,
                "created_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                CONSTRAINT "chk_audit_logs_action" CHECK ("action" IN ('INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'STATUS_CHANGE')),
                CONSTRAINT "fk_audit_logs_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        await queryRunner.query(`CREATE INDEX "idx_audit_logs_table_name_record_id" ON "audit_logs" ("table_name", "record_id")`);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_table_name" ON "audit_logs" ("table_name")`);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_record_id" ON "audit_logs" ("record_id")`);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_action" ON "audit_logs" ("action")`);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" ("created_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_audit_logs_created_at"`);
        await queryRunner.query(`DROP INDEX "idx_audit_logs_action"`);
        await queryRunner.query(`DROP INDEX "idx_audit_logs_record_id"`);
        await queryRunner.query(`DROP INDEX "idx_audit_logs_table_name"`);
        await queryRunner.query(`DROP INDEX "idx_audit_logs_user_id"`);
        await queryRunner.query(`DROP INDEX "idx_audit_logs_table_name_record_id"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
    }

}
