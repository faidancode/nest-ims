import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { FindOptionsWhere, IsNull, Like, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
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
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private toAuditValues(transaction: InventoryTransaction) {
    return {
      id: transaction.id,
      partId: transaction.partId,
      warehouseId: transaction.warehouseId,
      type: transaction.type,
      referenceType: transaction.referenceType,
      referenceId: transaction.referenceId,
      quantity: transaction.quantity,
      quantityBefore: transaction.quantityBefore,
      quantityAfter: transaction.quantityAfter,
      notes: transaction.notes,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      deletedAt: transaction.deletedAt,
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
        tableName: 'inventory_transactions',
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
    await this.writeAuditLog({
      recordId: entity.id,
      action: 'INSERT',
      newValues: this.toAuditValues(entity),
    });
    return this.findOne(entity.id);
  }

  async update(
    id: string,
    input: UpdateInventoryTransactionInput,
  ): Promise<InventoryTransaction> {
    const existing = await this.findOne(id);
    const oldValues = this.toAuditValues(existing);

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
    await this.writeAuditLog({
      recordId: existing.id,
      action: 'UPDATE',
      oldValues,
      newValues: this.toAuditValues(existing),
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    const oldValues = this.toAuditValues(existing);
    existing.deletedAt = new Date();
    await this.inventoryTransactionRepository.save(existing);
    await this.writeAuditLog({
      recordId: existing.id,
      action: 'DELETE',
      oldValues,
      newValues: this.toAuditValues(existing),
    });
  }
}
