import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedWarehouseRBAC1772624500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO roles (name, description, is_active, created_at, updated_at)
      SELECT 'ADMIN', 'Administrator role', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1 FROM roles WHERE name = 'ADMIN'
      );
    `);

    await queryRunner.query(`
      INSERT INTO roles (name, description, is_active, created_at, updated_at)
      SELECT 'MANAGER', 'Manager role', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1 FROM roles WHERE name = 'MANAGER'
      );
    `);

    await queryRunner.query(`
      INSERT INTO roles (name, description, is_active, created_at, updated_at)
      SELECT 'STAFF', 'Staff role', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1 FROM roles WHERE name = 'STAFF'
      );
    `);

    await queryRunner.query(`
      INSERT INTO permissions (name, action, resource, description, created_at, updated_at)
      SELECT 'WAREHOUSE_READ', 'READ', 'WAREHOUSE', 'Read warehouse data', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1 FROM permissions WHERE action = 'READ' AND resource = 'WAREHOUSE'
      );
    `);

    await queryRunner.query(`
      INSERT INTO permissions (name, action, resource, description, created_at, updated_at)
      SELECT 'WAREHOUSE_CREATE', 'CREATE', 'WAREHOUSE', 'Create warehouse data', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1 FROM permissions WHERE action = 'CREATE' AND resource = 'WAREHOUSE'
      );
    `);

    await queryRunner.query(`
      INSERT INTO permissions (name, action, resource, description, created_at, updated_at)
      SELECT 'WAREHOUSE_UPDATE', 'UPDATE', 'WAREHOUSE', 'Update warehouse data', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1 FROM permissions WHERE action = 'UPDATE' AND resource = 'WAREHOUSE'
      );
    `);

    await queryRunner.query(`
      INSERT INTO permissions (name, action, resource, description, created_at, updated_at)
      SELECT 'WAREHOUSE_DELETE', 'DELETE', 'WAREHOUSE', 'Delete warehouse data', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1 FROM permissions WHERE action = 'DELETE' AND resource = 'WAREHOUSE'
      );
    `);

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r
      JOIN permissions p ON p.resource = 'WAREHOUSE' AND p.action = 'READ'
      LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.permission_id = p.id
      WHERE r.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND rp.id IS NULL;
    `);

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r
      JOIN permissions p ON p.resource = 'WAREHOUSE' AND p.action IN ('CREATE', 'UPDATE', 'DELETE')
      LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.permission_id = p.id
      WHERE r.name IN ('ADMIN', 'SUPER_ADMIN')
        AND r.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND rp.id IS NULL;
    `);

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r
      JOIN permissions p ON p.resource = 'WAREHOUSE' AND p.action IN ('CREATE', 'UPDATE')
      LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.permission_id = p.id
      WHERE r.name = 'MANAGER'
        AND r.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND rp.id IS NULL;
    `);

    await queryRunner.query(`
      INSERT INTO user_roles (user_id, role_id, created_at, updated_at)
      SELECT u.id, u.role_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.role_id = u.role_id
      WHERE u.role_id IS NOT NULL
        AND ur.id IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE rp
      FROM role_permissions rp
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE p.resource = 'WAREHOUSE';
    `);

    await queryRunner.query(`
      DELETE FROM permissions
      WHERE resource = 'WAREHOUSE'
        AND action IN ('CREATE', 'READ', 'UPDATE', 'DELETE');
    `);

    await queryRunner.query(`
      DELETE FROM roles
      WHERE name IN ('ADMIN', 'MANAGER', 'STAFF')
        AND id NOT IN (SELECT DISTINCT role_id FROM users WHERE role_id IS NOT NULL);
    `);
  }
}
