import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { FindOptionsWhere, IsNull, Like, Repository } from 'typeorm';
import { InventoryTransaction } from './inventory-transaction.entity';
import {
  CreateInventoryTransactionInput,
  ListInventoryTransactionsQuery,
  UpdateInventoryTransactionInput,
} from './inventory-transactions.schema';

@Injectable()
export class InventoryTransactionsService {
  constructor(
    @InjectRepository(InventoryTransaction)
    private readonly inventoryTransactionRepository: Repository<InventoryTransaction>,
  ) {}

  private resolveOrder(sort: string): Record<string, 'ASC' | 'DESC'> {
    const [sortField, sortDirRaw] = sort.split(':');
    const sortDir = sortDirRaw?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    if (sortField === 'partId') {
      return { partId: sortDir };
    }

    if (sortField === 'warehouseId') {
      return { warehouseId: sortDir };
    }

    if (sortField === 'type') {
      return { type: sortDir };
    }

    if (sortField === 'referenceType') {
      return { referenceType: sortDir };
    }

    return { createdAt: sortDir };
  }

  private buildWhere(
    search?: string,
    q?: string,
  ):
    | FindOptionsWhere<InventoryTransaction>
    | FindOptionsWhere<InventoryTransaction>[] {
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
      {
        deletedAt: IsNull(),
        referenceId: Like(`%${term}%`),
      },
      {
        deletedAt: IsNull(),
        notes: Like(`%${term}%`),
      },
    ];
  }

  async findAll(query: ListInventoryTransactionsQuery) {
    const { page, limit, q, search, sort } = query;
    const where = this.buildWhere(search, q);
    const order = this.resolveOrder(sort);
    const skip = (page - 1) * limit;

    const [data, total] = await this.inventoryTransactionRepository.findAndCount({
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

  async findOne(id: string): Promise<InventoryTransaction> {
    const inventoryTransaction = await this.inventoryTransactionRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
    });

    if (!inventoryTransaction) {
      throw new NotFoundException('Inventory transaction not found');
    }

    return inventoryTransaction;
  }

  async create(
    input: CreateInventoryTransactionInput,
  ): Promise<InventoryTransaction> {
    const entity = this.inventoryTransactionRepository.create({
      id: randomUUID(),
      partId: input.partId,
      warehouseId: input.warehouseId,
      type: input.type,
      referenceType: input.referenceType,
      referenceId: input.referenceId ?? null,
      quantity: input.quantity.toFixed(4),
      quantityBefore: input.quantityBefore.toFixed(4),
      quantityAfter: input.quantityAfter.toFixed(4),
      notes: input.notes ?? null,
    });

    await this.inventoryTransactionRepository.save(entity);
    return this.findOne(entity.id);
  }

  async update(
    id: string,
    input: UpdateInventoryTransactionInput,
  ): Promise<InventoryTransaction> {
    const existing = await this.findOne(id);

    existing.partId = input.partId ?? existing.partId;
    existing.warehouseId = input.warehouseId ?? existing.warehouseId;
    existing.type = input.type ?? existing.type;
    existing.referenceType = input.referenceType ?? existing.referenceType;
    existing.referenceId = input.referenceId ?? existing.referenceId;
    existing.quantity =
      typeof input.quantity === 'number'
        ? input.quantity.toFixed(4)
        : existing.quantity;
    existing.quantityBefore =
      typeof input.quantityBefore === 'number'
        ? input.quantityBefore.toFixed(4)
        : existing.quantityBefore;
    existing.quantityAfter =
      typeof input.quantityAfter === 'number'
        ? input.quantityAfter.toFixed(4)
        : existing.quantityAfter;
    existing.notes = input.notes ?? existing.notes;

    await this.inventoryTransactionRepository.save(existing);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    existing.deletedAt = new Date();
    await this.inventoryTransactionRepository.save(existing);
  }
}
