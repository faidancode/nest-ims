import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { FindOptionsWhere, IsNull, Like, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SalesOrder, SalesOrderStatus } from './sales-order.entity';
import {
  CreateSalesOrderInput,
  ListSalesOrdersQuery,
  UpdateSalesOrderInput,
} from './sales-orders.schema';

@Injectable()
export class SalesOrdersService {
  constructor(
    @InjectRepository(SalesOrder)
    private readonly salesOrderRepository: Repository<SalesOrder>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private toAuditValues(order: SalesOrder) {
    return {
      id: order.id,
      soNumber: order.soNumber,
      customerId: order.customerId,
      status: order.status,
      orderDate: order.orderDate,
      expectedDate: order.expectedDate,
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
        tableName: 'sales_orders',
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

    if (sortField === 'soNumber') {
      return { soNumber: sortDir };
    }

    if (sortField === 'status') {
      return { status: sortDir };
    }

    if (sortField === 'orderDate') {
      return { orderDate: sortDir };
    }

    return { createdAt: sortDir };
  }

  private buildWhere(
    search?: string,
    q?: string,
  ): FindOptionsWhere<SalesOrder> | FindOptionsWhere<SalesOrder>[] {
    const term = search?.trim() || q?.trim();
    const baseWhere: FindOptionsWhere<SalesOrder> = { deletedAt: IsNull() };

    if (!term) {
      return baseWhere;
    }

    const validStatuses: SalesOrderStatus[] = [
      'DRAFT',
      'CONFIRMED',
      'COMPLETED',
      'CANCELLED',
    ];
    const statusTerm = term.toUpperCase() as SalesOrderStatus;
    const where: FindOptionsWhere<SalesOrder>[] = [
      { ...baseWhere, soNumber: Like(`%${term}%`) },
      { ...baseWhere, customerId: Like(`%${term}%`) },
    ];

    if (validStatuses.includes(statusTerm)) {
      where.push({ ...baseWhere, status: statusTerm });
    }

    return where;
  }

  async findAll(query: ListSalesOrdersQuery) {
    const { page, limit, q, search, sort } = query;
    const where = this.buildWhere(search, q);
    const order = this.resolveOrder(sort);
    const skip = (page - 1) * limit;

    const [data, total] = await this.salesOrderRepository.findAndCount({
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

  async findOne(id: string): Promise<SalesOrder> {
    const salesOrder = await this.salesOrderRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
    });

    if (!salesOrder) {
      throw new NotFoundException('Sales order not found');
    }

    return salesOrder;
  }

  async create(input: CreateSalesOrderInput): Promise<SalesOrder> {
    const existing = await this.salesOrderRepository.findOne({
      where: { soNumber: input.soNumber },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException('SO number already exists');
    }

    if (existing && existing.deletedAt) {
      const oldValues = this.toAuditValues(existing);
      existing.customerId = input.customerId;
      existing.status = input.status ?? 'DRAFT';
      existing.orderDate = input.orderDate ? new Date(input.orderDate) : new Date();
      existing.expectedDate = input.expectedDate ? new Date(input.expectedDate) : null;
      existing.notes = input.notes ?? null;
      existing.deletedAt = null;
      await this.salesOrderRepository.save(existing);
      await this.writeAuditLog({
        recordId: existing.id,
        action: 'UPDATE',
        oldValues,
        newValues: this.toAuditValues(existing),
      });
      return this.findOne(existing.id);
    }

    const entity = this.salesOrderRepository.create({
      id: randomUUID(),
      soNumber: input.soNumber,
      customerId: input.customerId,
      status: input.status ?? 'DRAFT',
      orderDate: input.orderDate ? new Date(input.orderDate) : new Date(),
      expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
      notes: input.notes ?? null,
    });

    await this.salesOrderRepository.save(entity);
    await this.writeAuditLog({
      recordId: entity.id,
      action: 'INSERT',
      oldValues: undefined,
      newValues: this.toAuditValues(entity),
    });
    return this.findOne(entity.id);
  }

  async update(id: string, input: UpdateSalesOrderInput): Promise<SalesOrder> {
    const existing = await this.findOne(id);
    const oldValues = this.toAuditValues(existing);

    if (input.soNumber && input.soNumber !== existing.soNumber) {
      const duplicate = await this.salesOrderRepository.findOne({
        where: { soNumber: input.soNumber, deletedAt: IsNull() },
      });

      if (duplicate) {
        throw new ConflictException('SO number already exists');
      }
    }

    existing.soNumber = input.soNumber ?? existing.soNumber;
    existing.customerId = input.customerId ?? existing.customerId;
    existing.status = input.status ?? existing.status;
    existing.orderDate = input.orderDate ? new Date(input.orderDate) : existing.orderDate;
    existing.expectedDate = input.expectedDate
      ? new Date(input.expectedDate)
      : existing.expectedDate;
    existing.notes = input.notes ?? existing.notes;

    await this.salesOrderRepository.save(existing);
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
    await this.salesOrderRepository.save(existing);
    await this.writeAuditLog({
      recordId: existing.id,
      action: 'DELETE',
      oldValues,
      newValues: this.toAuditValues(existing),
    });
  }
}
