import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { FindOptionsWhere, IsNull, Like, Repository } from 'typeorm';
import {
  CreateWarehouseInput,
  ListWarehousesQuery,
  UpdateWarehouseInput,
} from './warehouses.schema';
import { Warehouse } from './warehouse.entity';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
  ) {}

  private resolveOrder(sort: string): Record<string, 'ASC' | 'DESC'> {
    const [sortField, sortDirRaw] = sort.split(':');
    const sortDir = sortDirRaw?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    if (sortField === 'name') {
      return { name: sortDir };
    }

    if (sortField === 'location') {
      return { location: sortDir };
    }

    return { createdAt: sortDir };
  }

  private buildWhere(
    search?: string,
    q?: string,
  ): FindOptionsWhere<Warehouse> | FindOptionsWhere<Warehouse>[] {
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
        location: Like(`%${term}%`),
      },
    ];
  }

  async findAll(query: ListWarehousesQuery) {
    const { page, limit, q, search, sort } = query;
    const where = this.buildWhere(search, q);
    const order = this.resolveOrder(sort);
    const skip = (page - 1) * limit;

    const [data, total] = await this.warehouseRepository.findAndCount({
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

  async findOne(id: string): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return warehouse;
  }

  async create(input: CreateWarehouseInput): Promise<Warehouse> {
    const existing = await this.warehouseRepository.findOne({
      where: { name: input.name },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException('Warehouse name already exists');
    }

    if (existing && existing.deletedAt) {
      existing.location = input.location ?? null;
      existing.isActive = input.active ?? true;
      existing.deletedAt = null;
      await this.warehouseRepository.save(existing);
      return this.findOne(existing.id);
    }

    const entity = this.warehouseRepository.create({
      id: randomUUID(),
      name: input.name,
      location: input.location ?? null,
      isActive: input.active ?? true,
    });

    await this.warehouseRepository.save(entity);
    return this.findOne(entity.id);
  }

  async update(id: string, input: UpdateWarehouseInput): Promise<Warehouse> {
    const existing = await this.findOne(id);

    if (input.name && input.name !== existing.name) {
      const duplicate = await this.warehouseRepository.findOne({
        where: { name: input.name, deletedAt: IsNull() },
      });

      if (duplicate) {
        throw new ConflictException('Warehouse name already exists');
      }
    }

    existing.name = input.name ?? existing.name;
    existing.location = input.location ?? existing.location;
    existing.isActive =
      typeof input.active === 'boolean' ? input.active : existing.isActive;

    await this.warehouseRepository.save(existing);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    existing.deletedAt = new Date();
    await this.warehouseRepository.save(existing);
  }
}
