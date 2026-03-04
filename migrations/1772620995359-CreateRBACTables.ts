import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRBACTables1772620995359 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE roles (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_by CHAR(36),
        updated_by CHAR(36),
        deleted_by CHAR(36),
        CONSTRAINT uq_roles_name UNIQUE (name),
        CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_roles_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_roles_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`CREATE INDEX idx_roles_is_active ON roles (is_active);`);
    await queryRunner.query(`CREATE INDEX idx_roles_deleted_at ON roles (deleted_at);`);

    await queryRunner.query(`
      CREATE TABLE permissions (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(150) NOT NULL,
        action VARCHAR(50) NOT NULL,
        resource VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_by CHAR(36),
        updated_by CHAR(36),
        deleted_by CHAR(36),
        CONSTRAINT uq_permissions_action_resource UNIQUE (action, resource),
        CONSTRAINT chk_permissions_action CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT', 'IMPORT')),
        CONSTRAINT fk_permissions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_permissions_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_permissions_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`CREATE INDEX idx_permissions_action ON permissions (action);`);
    await queryRunner.query(`CREATE INDEX idx_permissions_resource ON permissions (resource);`);
    await queryRunner.query(`CREATE INDEX idx_permissions_deleted_at ON permissions (deleted_at);`);

    await queryRunner.query(`
      CREATE TABLE role_permissions (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        role_id CHAR(36) NOT NULL,
        permission_id CHAR(36) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_by CHAR(36),
        updated_by CHAR(36),
        deleted_by CHAR(36),
        CONSTRAINT uq_role_permissions_role_permission UNIQUE (role_id, permission_id),
        CONSTRAINT fk_role_permissions_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        CONSTRAINT fk_role_permissions_permission_id FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
        CONSTRAINT fk_role_permissions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_role_permissions_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_role_permissions_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`CREATE INDEX idx_role_permissions_role_id ON role_permissions (role_id);`);
    await queryRunner.query(`CREATE INDEX idx_role_permissions_permission_id ON role_permissions (permission_id);`);
    await queryRunner.query(`CREATE INDEX idx_role_permissions_deleted_at ON role_permissions (deleted_at);`);

    await queryRunner.query(`
      CREATE TABLE user_roles (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id CHAR(36) NOT NULL,
        role_id CHAR(36) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_by CHAR(36),
        updated_by CHAR(36),
        deleted_by CHAR(36),
        CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role_id),
        CONSTRAINT fk_user_roles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_roles_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_roles_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_user_roles_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_user_roles_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);`);
    await queryRunner.query(`CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);`);
    await queryRunner.query(`CREATE INDEX idx_user_roles_deleted_at ON user_roles (deleted_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_user_roles_deleted_at ON user_roles;`);
    await queryRunner.query(`DROP INDEX idx_user_roles_role_id ON user_roles;`);
    await queryRunner.query(`DROP INDEX idx_user_roles_user_id ON user_roles;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_roles;`);

    await queryRunner.query(`DROP INDEX idx_role_permissions_deleted_at ON role_permissions;`);
    await queryRunner.query(`DROP INDEX idx_role_permissions_permission_id ON role_permissions;`);
    await queryRunner.query(`DROP INDEX idx_role_permissions_role_id ON role_permissions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_permissions;`);

    await queryRunner.query(`DROP INDEX idx_permissions_deleted_at ON permissions;`);
    await queryRunner.query(`DROP INDEX idx_permissions_resource ON permissions;`);
    await queryRunner.query(`DROP INDEX idx_permissions_action ON permissions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS permissions;`);

    await queryRunner.query(`DROP INDEX idx_roles_deleted_at ON roles;`);
    await queryRunner.query(`DROP INDEX idx_roles_is_active ON roles;`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles;`);
  }
}
