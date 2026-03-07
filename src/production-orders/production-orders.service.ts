import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { FindOptionsWhere, IsNull, Like, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProductionOrder, ProductionOrderStatus } from './production-order.entity';
import {
  CreateProductionOrderInput,
  ListProductionOrdersQuery,
  UpdateProductionOrderInput,
} from './production-orders.schema';

@Injectable()
export class ProductionOrdersService {
  constructor(
    @InjectRepository(ProductionOrder)
    private readonly productionOrderRepository: Repository<ProductionOrder>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private toAuditValues(order: ProductionOrder) {
    return {
      id: order.id,
      poNumber: order.poNumber,
      finishedPartId: order.finishedPartId,
      warehouseId: order.warehouseId,
      quantity: order.quantity,
      status: order.status,
      productionDate: order.productionDate,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      deletedAt: order.deletedAt,
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
        tableName: 'production_orders',
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

    if (sortField === 'poNumber') {
      return { poNumber: sortDir };
    }

    if (sortField === 'status') {
      return { status: sortDir };
    }

    if (sortField === 'productionDate') {
      return { productionDate: sortDir };
    }

    return { createdAt: sortDir };
  }

  private buildWhere(
    search?: string,
    q?: string,
  ): FindOptionsWhere<ProductionOrder> | FindOptionsWhere<ProductionOrder>[] {
    const term = search?.trim() || q?.trim();

    if (!term) {
      return { deletedAt: IsNull() };
    }

    const validStatuses: ProductionOrderStatus[] = ['DRAFT', 'COMPLETED'];
    const statusTerm = term.toUpperCase() as ProductionOrderStatus;
    const where: FindOptionsWhere<ProductionOrder>[] = [
      { deletedAt: IsNull(), poNumber: Like(`%${term}%`) },
      { deletedAt: IsNull(), finishedPartId: Like(`%${term}%`) },
      { deletedAt: IsNull(), warehouseId: Like(`%${term}%`) },
    ];

    if (validStatuses.includes(statusTerm)) {
      where.push({ deletedAt: IsNull(), status: statusTerm });
    }

    return where;
  }

  async findAll(query: ListProductionOrdersQuery) {
    const { page, limit, q, search, sort } = query;
    const where = this.buildWhere(search, q);
    const order = this.resolveOrder(sort);
    const skip = (page - 1) * limit;

    const [data, total] = await this.productionOrderRepository.findAndCount({
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

  async findOne(id: string): Promise<ProductionOrder> {
    const order = await this.productionOrderRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!order) {
      throw new NotFoundException('Production order not found');
    }

    return order;
  }

  async create(input: CreateProductionOrderInput): Promise<ProductionOrder> {
    const existing = await this.productionOrderRepository.findOne({
      where: { poNumber: input.poNumber },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException('Production order number already exists');
    }

    if (existing && existing.deletedAt) {
      const oldValues = this.toAuditValues(existing);
      existing.finishedPartId = input.finishedPartId;
      existing.warehouseId = input.warehouseId;
      existing.quantity = input.quantity.toFixed(4);
      existing.status = input.status ?? 'DRAFT';
      existing.productionDate = input.productionDate
        ? new Date(input.productionDate)
        : null;
      existing.notes = input.notes ?? null;
      existing.deletedAt = null;
      await this.productionOrderRepository.save(existing);
      await this.writeAuditLog({
        recordId: existing.id,
        action: 'UPDATE',
        oldValues,
        newValues: this.toAuditValues(existing),
      });
      return this.findOne(existing.id);
    }

    const entity = this.productionOrderRepository.create({
      id: randomUUID(),
      poNumber: input.poNumber,
      finishedPartId: input.finishedPartId,
      warehouseId: input.warehouseId,
      quantity: input.quantity.toFixed(4),
      status: input.status ?? 'DRAFT',
      productionDate: input.productionDate ? new Date(input.productionDate) : null,
      notes: input.notes ?? null,
    });

    await this.productionOrderRepository.save(entity);
    await this.writeAuditLog({
      recordId: entity.id,
      action: 'INSERT',
      oldValues: undefined,
      newValues: this.toAuditValues(entity),
    });
    return this.findOne(entity.id);
  }

  async update(
    id: string,
    input: UpdateProductionOrderInput,
  ): Promise<ProductionOrder> {
    const existing = await this.findOne(id);
    const oldValues = this.toAuditValues(existing);

    if (input.poNumber && input.poNumber !== existing.poNumber) {
      const duplicate = await this.productionOrderRepository.findOne({
        where: { poNumber: input.poNumber, deletedAt: IsNull() },
      });

      if (duplicate) {
        throw new ConflictException('Production order number already exists');
      }
    }

    existing.poNumber = input.poNumber ?? existing.poNumber;
    existing.finishedPartId = input.finishedPartId ?? existing.finishedPartId;
    existing.warehouseId = input.warehouseId ?? existing.warehouseId;
    existing.quantity =
      typeof input.quantity === 'number'
        ? input.quantity.toFixed(4)
        : existing.quantity;
    existing.status = input.status ?? existing.status;
    existing.productionDate = input.productionDate
      ? new Date(input.productionDate)
      : existing.productionDate;
    existing.notes = input.notes ?? existing.notes;

    await this.productionOrderRepository.save(existing);
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
    await this.productionOrderRepository.save(existing);
    await this.writeAuditLog({
      recordId: existing.id,
      action: 'DELETE',
      oldValues,
      newValues: this.toAuditValues(existing),
    });
  }
}

