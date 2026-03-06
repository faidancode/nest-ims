import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

type SeedUserAssignment = {
  email: string;
  id: string;
  roleName: 'ADMIN' | 'SUPERADMIN';
};

const ROLES_TO_SEED = [
  {
    name: 'SUPERADMIN',
    description: 'Super administrator role with full access',
  },
  {
    name: 'ADMIN',
    description: 'Administrator role with full access',
  },
  {
    name: 'MANAGER',
    description: 'Manager role',
  },
  {
    name: 'STAFF',
    description: 'Staff role',
  },
  {
    name: 'USER',
    description: 'User role',
  },
] as const;

const ACTIONS = [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'EXPORT',
  'IMPORT',
] as const;

const RESOURCES = [
  'USER',
  'ROLE',
  'PERMISSION',
  'WAREHOUSE',
  'PART',
  'SUPPLIER',
  'CUSTOMER',
  'INVENTORY',
  'PURCHASE_ORDER',
  'PURCHASE_ORDER_ITEM',
  'SALES_ORDER',
  'SALES_ORDER_ITEM',
  'BILL_OF_MATERIAL',
  'PRODUCTION_ORDER',
  'INVENTORY_TRANSACTION',
  'AUDIT_LOG',
] as const;

const USERS_WITH_FULL_ACCESS: SeedUserAssignment[] = [
  {
    email: 'admin@example.com',
    id: '208afb4f-d1c1-4ce7-bff3-943d1401ae89',
    roleName: 'ADMIN',
  },
  {
    email: 'superadmin@example.com',
    id: '6953e672-2b91-4645-ab79-23b6962c103f',
    roleName: 'SUPERADMIN',
  },
];

async function seed() {
  const configService = new ConfigService();
  const dataSource = new DataSource({
    type: 'mysql',
    host: configService.getOrThrow<string>('DB_HOST'),
    port: configService.getOrThrow<number>('DB_PORT'),
    username: configService.getOrThrow<string>('DB_USERNAME'),
    password: configService.getOrThrow<string>('DB_PASSWORD'),
    database: configService.getOrThrow<string>('DB_DATABASE'),
    synchronize: false,
  });

  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    for (const role of ROLES_TO_SEED) {
      await queryRunner.query(
        `
          INSERT INTO roles (name, description, is_active, created_at, updated_at, deleted_at)
          VALUES (?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
          ON DUPLICATE KEY UPDATE
            description = VALUES(description),
            is_active = TRUE,
            deleted_at = NULL,
            updated_at = CURRENT_TIMESTAMP;
        `,
        [role.name, role.description],
      );
    }

    for (const resource of RESOURCES) {
      for (const action of ACTIONS) {
        await queryRunner.query(
          `
            INSERT INTO permissions (name, action, resource, description, created_at, updated_at, deleted_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
            ON DUPLICATE KEY UPDATE
              name = VALUES(name),
              description = VALUES(description),
              deleted_at = NULL,
              updated_at = CURRENT_TIMESTAMP;
          `,
          [
            `${resource}_${action}`,
            action,
            resource,
            `${action} permission for ${resource}`,
          ],
        );
      }
    }

    await queryRunner.query(`
      UPDATE role_permissions rp
      INNER JOIN roles r ON r.id = rp.role_id
      SET rp.deleted_at = NULL,
          rp.updated_at = CURRENT_TIMESTAMP
      WHERE r.name IN ('ADMIN', 'SUPERADMIN');
    `);

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r
      CROSS JOIN permissions p
      LEFT JOIN role_permissions rp
        ON rp.role_id = r.id
        AND rp.permission_id = p.id
      WHERE r.name IN ('ADMIN', 'SUPERADMIN')
        AND r.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND rp.id IS NULL;
    `);

    for (const assignment of USERS_WITH_FULL_ACCESS) {
      await queryRunner.query(
        `
          UPDATE users u
          INNER JOIN roles r ON r.name = ?
          SET u.role_id = r.id,
              u.updated_at = CURRENT_TIMESTAMP
          WHERE (u.id = ? OR u.email = ?)
            AND u.deleted_at IS NULL;
        `,
        [assignment.roleName, assignment.id, assignment.email],
      );

      await queryRunner.query(
        `
          UPDATE user_roles ur
          INNER JOIN roles r ON r.id = ur.role_id
          INNER JOIN users u ON u.id = ur.user_id
          SET ur.deleted_at = NULL,
              ur.updated_at = CURRENT_TIMESTAMP
          WHERE r.name = ?
            AND (u.id = ? OR u.email = ?);
        `,
        [assignment.roleName, assignment.id, assignment.email],
      );

      await queryRunner.query(
        `
          INSERT INTO user_roles (user_id, role_id, created_at, updated_at)
          SELECT u.id, r.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          FROM users u
          INNER JOIN roles r ON r.name = ?
          LEFT JOIN user_roles ur
            ON ur.user_id = u.id
            AND ur.role_id = r.id
          WHERE (u.id = ? OR u.email = ?)
            AND u.deleted_at IS NULL
            AND ur.id IS NULL;
        `,
        [assignment.roleName, assignment.id, assignment.email],
      );
    }

    await queryRunner.commitTransaction();
    console.log('RBAC seeding completed successfully.');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('RBAC seeding failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seed().catch(() => {
  process.exit(1);
});
