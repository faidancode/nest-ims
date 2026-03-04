import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBOMTable1772619784536 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE bill_of_materials (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        finished_part_id CHAR(36) NOT NULL,
        raw_part_id CHAR(36) NOT NULL,
        quantity DECIMAL(18,4) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_by CHAR(36),
        updated_by CHAR(36),
        deleted_by CHAR(36),
        CONSTRAINT uq_bom_finished_raw UNIQUE (finished_part_id, raw_part_id),
        CONSTRAINT fk_bom_finished_part_id FOREIGN KEY (finished_part_id) REFERENCES parts(id) ON DELETE RESTRICT,
        CONSTRAINT fk_bom_raw_part_id FOREIGN KEY (raw_part_id) REFERENCES parts(id) ON DELETE RESTRICT,
        CONSTRAINT fk_bom_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_bom_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_bom_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`CREATE INDEX idx_bom_finished_part_id ON bill_of_materials (finished_part_id);`);
    await queryRunner.query(`CREATE INDEX idx_bom_raw_part_id ON bill_of_materials (raw_part_id);`);
    await queryRunner.query(`CREATE INDEX idx_bom_deleted_at ON bill_of_materials (deleted_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_bom_deleted_at ON bill_of_materials;`);
    await queryRunner.query(`DROP INDEX idx_bom_raw_part_id ON bill_of_materials;`);
    await queryRunner.query(`DROP INDEX idx_bom_finished_part_id ON bill_of_materials;`);
    await queryRunner.query(`DROP TABLE bill_of_materials;`);
  }
}
