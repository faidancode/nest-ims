import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterUsersRoleToRoleId1772623000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN role_id CHAR(36) NULL AFTER password;
    `);

    await queryRunner.query(`
      INSERT INTO roles (id, name, is_active, created_at, updated_at)
      SELECT UUID(), u.role, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM users u
      WHERE u.role IS NOT NULL
        AND TRIM(u.role) <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM roles r
          WHERE r.name = u.role
        )
      GROUP BY u.role;
    `);

    await queryRunner.query(`
      INSERT INTO roles (id, name, is_active, created_at, updated_at)
      SELECT UUID(), 'USER', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1
        FROM roles r
        WHERE r.name = 'USER'
      );
    `);

    await queryRunner.query(`
      UPDATE users u
      JOIN roles r ON r.name = u.role
      SET u.role_id = r.id
      WHERE u.role IS NOT NULL
        AND TRIM(u.role) <> '';
    `);

    await queryRunner.query(`
      UPDATE users u
      JOIN roles r ON r.name = 'USER'
      SET u.role_id = r.id
      WHERE u.role_id IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE users
      MODIFY COLUMN role_id CHAR(36) NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_users_role_id ON users (role_id);
    `);

    await queryRunner.query(`
      ALTER TABLE users
      ADD CONSTRAINT fk_users_role_id
      FOREIGN KEY (role_id) REFERENCES roles(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN role;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN role VARCHAR(50) NULL AFTER password;
    `);

    await queryRunner.query(`
      UPDATE users u
      JOIN roles r ON r.id = u.role_id
      SET u.role = r.name;
    `);

    await queryRunner.query(`
      UPDATE users
      SET role = 'USER'
      WHERE role IS NULL OR TRIM(role) = '';
    `);

    await queryRunner.query(`
      ALTER TABLE users
      MODIFY COLUMN role VARCHAR(50) NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE users
      DROP FOREIGN KEY fk_users_role_id;
    `);

    await queryRunner.query(`
      DROP INDEX idx_users_role_id ON users;
    `);

    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN role_id;
    `);
  }
}
