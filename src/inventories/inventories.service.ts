import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { FindOptionsWhere, IsNull, Like, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Inventory } from './inventory.entity';
import {
  CreateInventoryInput,
  ListInventoriesQuery,
  UpdateInventoryInput,
} from './inventories.schema';

@Injectable()
export class InventoriesService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private toAuditValues(inventory: Inventory) {
    return {
      id: inventory.id,
      partId: inventory.partId,
      warehouseId: inventory.warehouseId,
      quantity: inventory.quantity,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
      deletedAt: inventory.deletedAt,
    };
  }

  private async writeAuditLog(input: {
    recordId: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
  }) {
    try {
      await this.auditLogsService.create({
        tableName: 'inventories',
        recordId: input.recordId,
        action: input.action,
        oldValues: input.oldValues,
        newValues: input.newValues,
      });
    } catch {
      // Do not fail business transaction when audit logging fails.
    }
  }

  private resolveOrder(sort: string): Record<string, 'ASC' | 'DESC'> {
    const [sortField, sortDirRaw] = sort.split(':');
    const sortDir = sortDirRaw?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    if (sortField === 'partId') {
      return { partId: sortDir };
    }

    if (sortField === 'warehouseId') {
      return { warehouseId: sortDir };
    }

    if (sortField === 'quantity') {
      return { quantity: sortDir };
    }

    return { createdAt: sortDir };
  }

  private buildWhere(
    search?: string,
    q?: string,
  ): FindOptionsWhere<Inventory> | FindOptionsWhere<Inventory>[] {
    const term = (search ?? q)?.trim();

    if (!term) {
      return { deletedAt: IsNull() };
    }

    return [
      {
        deletedAt: IsNull(),
        partId: Like(`%${term}%`),
      },
      {
        deletedAt: IsNull(),
        warehouseId: Like(`%${term}%`),
      },
    ];
  }

  async findAll(query: ListInventoriesQuery) {
    const { page, limit, q, search, sort } = query;
    const where = this.buildWhere(search, q);
    const order = this.resolveOrder(sort);
    const skip = (page - 1) * limit;

    const [data, total] = await this.inventoryRepository.findAndCount({
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

  async findOne(id: string): Promise<Inventory> {
    const inventory = await this.inventoryRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    return inventory;
  }

  // src/inventories/inventories.service.ts

  async findByPartAndWarehouse(
    partId: string,
    warehouseId: string,
  ): Promise<Inventory | null> {
    return await this.inventoryRepository.findOne({
      where: {
        partId,
        warehouseId,
        deletedAt: IsNull(),
      },
    });
  }

  async create(input: CreateInventoryInput): Promise<Inventory> {
    const existing = await this.inventoryRepository.findOne({
      where: { partId: input.partId, warehouseId: input.warehouseId },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        'Inventory for part and warehouse already exists',
      );
    }

    if (existing && existing.deletedAt) {
      const oldValues = this.toAuditValues(existing);
      existing.quantity = input.quantity.toFixed(4);
      existing.deletedAt = null;
      await this.inventoryRepository.save(existing);
      await this.writeAuditLog({
        recordId: existing.id,
        action: 'UPDATE',
        oldValues,
        newValues: this.toAuditValues(existing),
      });
      return this.findOne(existing.id);
    }

    const entity = this.inventoryRepository.create({
      id: randomUUID(),
      partId: input.partId,
      warehouseId: input.warehouseId,
      quantity: input.quantity.toFixed(4),
    });

    await this.inventoryRepository.save(entity);
    await this.writeAuditLog({
      recordId: entity.id,
      action: 'INSERT',
      newValues: this.toAuditValues(entity),
    });
    return this.findOne(entity.id);
  }

  async update(id: string, input: UpdateInventoryInput): Promise<Inventory> {
    const existing = await this.findOne(id);
    const oldValues = this.toAuditValues(existing);

    const nextPartId = input.partId ?? existing.partId;
    const nextWarehouseId = input.warehouseId ?? existing.warehouseId;

    if (
      nextPartId !== existing.partId ||
      nextWarehouseId !== existing.warehouseId
    ) {
      const duplicate = await this.inventoryRepository.findOne({
        where: {
          partId: nextPartId,
          warehouseId: nextWarehouseId,
          deletedAt: IsNull(),
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'Inventory for part and warehouse already exists',
        );
      }
    }

    existing.partId = nextPartId;
    existing.warehouseId = nextWarehouseId;
    existing.quantity =
      typeof input.quantity === 'number'
        ? input.quantity.toFixed(4)
        : existing.quantity;

    await this.inventoryRepository.save(existing);
    await this.writeAuditLog({
      recordId: existing.id,
      action: 'UPDATE',
      oldValues,
      newValues: this.toAuditValues(existing),
    });
    return this.findOne(id);
  }
}
