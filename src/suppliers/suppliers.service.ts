import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { FindOptionsWhere, IsNull, Like, Repository } from 'typeorm';
import { Supplier } from './supplier.entity';
import {
  CreateSupplierInput,
  ListSuppliersQuery,
  UpdateSupplierInput,
} from './suppliers.schema';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  private resolveOrder(sort: string): Record<string, 'ASC' | 'DESC'> {
    const [sortField, sortDirRaw] = sort.split(':');
    const sortDir = sortDirRaw?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    if (sortField === 'name') {
      return { name: sortDir };
    }

    if (sortField === 'contactName') {
      return { contactName: sortDir };
    }

    if (sortField === 'email') {
      return { email: sortDir };
    }

    return { createdAt: sortDir };
  }

  private buildWhere(
    search?: string,
    q?: string,
  ): FindOptionsWhere<Supplier> | FindOptionsWhere<Supplier>[] {
    const term = (search ?? q)?.trim();

    if (!term) {
      return { deletedAt: IsNull() };
    }

    return [
      {
        deletedAt: IsNull(),
        name: Like(`%${term}%`),
      },
      {
        deletedAt: IsNull(),
        contactName: Like(`%${term}%`),
      },
      {
        deletedAt: IsNull(),
        email: Like(`%${term}%`),
      },
      {
        deletedAt: IsNull(),
        phone: Like(`%${term}%`),
      },
    ];
  }

  async findAll(query: ListSuppliersQuery) {
    const { page, limit, q, search, sort } = query;
    const where = this.buildWhere(search, q);
    const order = this.resolveOrder(sort);
    const skip = (page - 1) * limit;

    const [data, total] = await this.supplierRepository.findAndCount({
      where,
      order,
      skip,
      take: limit,
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async create(input: CreateSupplierInput): Promise<Supplier> {
    const existing = await this.supplierRepository.findOne({
      where: { name: input.name },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException('Supplier name already exists');
    }

    if (existing && existing.deletedAt) {
      existing.contactName = input.contactName ?? null;
      existing.email = input.email ?? null;
      existing.phone = input.phone ?? null;
      existing.address = input.address ?? null;
      existing.isActive = input.active ?? true;
      existing.deletedAt = null;
      await this.supplierRepository.save(existing);
      return this.findOne(existing.id);
    }

    const entity = this.supplierRepository.create({
      id: randomUUID(),
      name: input.name,
      contactName: input.contactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      isActive: input.active ?? true,
    });

    await this.supplierRepository.save(entity);
    return this.findOne(entity.id);
  }

  async update(id: string, input: UpdateSupplierInput): Promise<Supplier> {
    const existing = await this.findOne(id);

    if (input.name && input.name !== existing.name) {
      const duplicate = await this.supplierRepository.findOne({
        where: { name: input.name, deletedAt: IsNull() },
      });

      if (duplicate) {
        throw new ConflictException('Supplier name already exists');
      }
    }

    existing.name = input.name ?? existing.name;
    existing.contactName = input.contactName ?? existing.contactName;
    existing.email = input.email ?? existing.email;
    existing.phone = input.phone ?? existing.phone;
    existing.address = input.address ?? existing.address;
    existing.isActive =
      typeof input.active === 'boolean' ? input.active : existing.isActive;

    await this.supplierRepository.save(existing);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    existing.deletedAt = new Date();
    await this.supplierRepository.save(existing);
  }
}
