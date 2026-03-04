import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/entities/role.entity';
import { UserRole } from '../users/entities/user-role.entity';
import { hash } from 'bcrypt';
import { config } from 'dotenv';
import { ConfigService } from '@nestjs/config';

config();

async function seed() {
    const configService = new ConfigService();

    const dataSource = new DataSource({
        type: 'mysql',
        host: configService.getOrThrow<string>('DB_HOST'),
        port: configService.getOrThrow<number>('DB_PORT'),
        username: configService.getOrThrow<string>('DB_USERNAME'),
        password: configService.getOrThrow<string>('DB_PASSWORD'),
        database: configService.getOrThrow<string>('DB_DATABASE'),
        entities: [User, Role, UserRole],
        synchronize: false,
    });

    try {
        await dataSource.initialize();
        console.log('Data Source has been initialized!');

        const userRepository = dataSource.getRepository(User);
        const roleRepository = dataSource.getRepository(Role);
        const userRoleRepository = dataSource.getRepository(UserRole);

        const passwordHash = await hash('password123', 10);

        const rolesToSeed = ['SUPERADMIN', 'ADMIN', 'USER'];
        const roleMap = new Map<string, string>();

        for (const roleName of rolesToSeed) {
            let role = await roleRepository.findOneBy({ name: roleName });
            if (!role) {
                role = roleRepository.create({ name: roleName });
                await roleRepository.save(role);
                console.log(`Role ${roleName} created.`);
            }
            roleMap.set(roleName, role.id);
        }

        const usersToSeed = [
            {
                name: 'Super Admin',
                email: 'superadmin@example.com',
                password: passwordHash,
                roleName: 'SUPERADMIN',
                isActive: true,
            },
            {
                name: 'Admin User',
                email: 'admin@example.com',
                password: passwordHash,
                roleName: 'ADMIN',
                isActive: true,
            },
        ];

        for (const userData of usersToSeed) {
            const existingUser = await userRepository.findOneBy({ email: userData.email });
            const roleId = roleMap.get(userData.roleName);

            if (!roleId) {
                console.error(`Role ${userData.roleName} not found. Skipping user ${userData.email}`);
                continue;
            }

            let userId: string;
            if (existingUser) {
                console.log(`User ${userData.email} already exists. Updating role...`);
                userId = existingUser.id;
                existingUser.roleId = roleId;
                await userRepository.save(existingUser);
            } else {
                const user = userRepository.create({
                    name: userData.name,
                    email: userData.email,
                    password: userData.password,
                    roleId: roleId,
                    isActive: userData.isActive,
                });
                const savedUser = await userRepository.save(user);
                userId = savedUser.id;
                console.log(`User ${userData.email} seeded successfully.`);
            }

            // Sync with user_roles table
            const existingUserRole = await userRoleRepository.findOneBy({ userId, roleId });
            if (!existingUserRole) {
                const userRole = userRoleRepository.create({ userId, roleId });
                await userRoleRepository.save(userRole);
                console.log(`User role association for ${userData.email} created.`);
            }
        }

        console.log('Seeding completed!');
    } catch (err) {
        console.error('Error during Data Source initialization', err);
    } finally {
        await dataSource.destroy();
    }
}

seed();
