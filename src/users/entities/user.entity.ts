import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 150 })
    name: string;

    @Column({ length: 150, unique: true })
    email: string;

    @Column({ length: 255 })
    password: string;

    @Column({ length: 50 })
    role: string;

    @Column({ type: 'boolean', default: true, name: 'is_active' })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', nullable: true })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', nullable: true })
    deletedAt: Date;
}
