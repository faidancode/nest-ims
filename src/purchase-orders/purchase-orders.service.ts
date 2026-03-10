import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  IsNull,
  Like,
  Repository,
} from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PurchaseOrder, PurchaseOrderStatus } from './purchase-order.entity';
import {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersQuery,
  UpdatePurchaseOrderInput,
} from './purchase-orders.schema';
import { PurchaseOrderItem } from './purchase-order-item.entity';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly purchaseOrderItemRepository: Repository<PurchaseOrderItem>,
    private readonly auditLogsService: AuditLogsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private toAuditValues(order: PurchaseOrder) {
    return {
      id: order.id,
      poNumber: order.poNumber,
      supplierId: order.supplierId,
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
        tableName: 'purchase_orders',
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

    if (sortField === 'orderDate') {
      return { orderDate: sortDir };
    }

    return { createdAt: sortDir };
  }

  private buildWhere(
    search?: string,
    q?: string,
  ): FindOptionsWhere<PurchaseOrder> | FindOptionsWhere<PurchaseOrder>[] {
    const term = search?.trim() || q?.trim();
    const baseWhere: FindOptionsWhere<PurchaseOrder> = { deletedAt: IsNull() };

    if (!term) {
      return baseWhere;
    }

    const validStatuses: PurchaseOrderStatus[] = ['DRAFT', 'RECEIVED'];
    const statusTerm = term.toUpperCase() as PurchaseOrderStatus;

    const conditions: FindOptionsWhere<PurchaseOrder>[] = [
      { ...baseWhere, poNumber: Like(`%${term}%`) },
      { ...baseWhere, supplierId: Like(`%${term}%`) },
    ];

    if (validStatuses.includes(statusTerm)) {
      conditions.push({
        ...baseWhere,
        status: statusTerm,
      });
    }

    return conditions;
  }

  async findAll(query: ListPurchaseOrdersQuery) {
    const { page, limit, q, search, sort } = query;
    const where = this.buildWhere(search, q);
    const order = this.resolveOrder(sort);
    const skip = (page - 1) * limit;

    const [data, total] = await this.purchaseOrderRepository.findAndCount({
      where,
      order,
      skip,
      take: limit,
      relations: ['supplier'],
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

  async findOne(id: string): Promise<PurchaseOrder> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
      relations: ['items', 'items.part', 'supplier'],
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    return purchaseOrder;
  }

  async create(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
    return this.dataSource.transaction(async (manager) => {
      const poNumber = await this.generatePoNumber(manager);

      const entity = manager.create(PurchaseOrder, {
        id: randomUUID(),
        poNumber,
        supplierId: input.supplierId,
        status: input.status ?? 'DRAFT',
        orderDate: input.orderDate ? new Date(input.orderDate) : new Date(),
        expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
        notes: input.notes ?? null,
      });

      const savedPO = await manager.save(entity);

      if (input.items?.length) {
        const items = input.items.map((item) =>
          manager.create(PurchaseOrderItem, {
            id: randomUUID(),
            purchaseOrderId: savedPO.id,
            partId: item.partId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }),
        );

        await manager.save(items);
      }

      await this.writeAuditLog({
        recordId: savedPO.id,
        action: 'INSERT',
        oldValues: undefined,
        newValues: this.toAuditValues(savedPO),
      });

      return this.findOne(savedPO.id);
    });
  }

  async update(
    id: string,
    input: UpdatePurchaseOrderInput,
  ): Promise<PurchaseOrder> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(PurchaseOrder, {
        where: { id },
        relations: ['items'],
      });

      if (!existing) {
        throw new NotFoundException('Purchase order not found');
      }

      if (existing.status === 'RECEIVED') {
        throw new BadRequestException('Cannot update received PO');
      }

      const oldValues = this.toAuditValues(existing);

      if (input.poNumber && input.poNumber !== existing.poNumber) {
        const duplicate = await manager.findOne(PurchaseOrder, {
          where: {
            poNumber: input.poNumber,
            deletedAt: IsNull(),
          },
        });

        if (duplicate) {
          throw new ConflictException('PO number already exists');
        }
      }

      existing.poNumber = input.poNumber ?? existing.poNumber;
      existing.supplierId = input.supplierId ?? existing.supplierId;
      existing.status = input.status ?? existing.status;
      existing.orderDate = input.orderDate
        ? new Date(input.orderDate)
        : existing.orderDate;
      existing.expectedDate = input.expectedDate
        ? new Date(input.expectedDate)
        : existing.expectedDate;
      existing.notes = input.notes ?? existing.notes;

      await manager.save(existing);

      if (input.items) {
        await manager.delete(PurchaseOrderItem, {
          purchaseOrderId: id,
        });

        const items = input.items.map((item) =>
          manager.create(PurchaseOrderItem, {
            id: randomUUID(),
            purchaseOrderId: id,
            partId: item.partId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }),
        );

        await manager.save(items);
      }

      await this.writeAuditLog({
        recordId: existing.id,
        action: 'UPDATE',
        oldValues,
        newValues: this.toAuditValues(existing),
      });

      return this.findOne(id);
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    const oldValues = this.toAuditValues(existing);
    existing.deletedAt = new Date();
    await this.purchaseOrderRepository.save(existing);
    await this.writeAuditLog({
      recordId: existing.id,
      action: 'DELETE',
      oldValues,
      newValues: this.toAuditValues(existing),
    });
  }

  // purchase-orders/purchase-orders.service.ts

  private async generatePoNumber(manager: EntityManager): Promise<string> {
    const now = new Date();
    const prefix = `PO/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/`;

    const lastOrder = await manager.findOne(PurchaseOrder, {
      where: { poNumber: Like(`${prefix}%`) },
      order: { poNumber: 'DESC' },
      select: ['poNumber'],
      lock: { mode: 'pessimistic_write' }, // Mencegah double number jika request masuk barengan
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = lastOrder.poNumber.split('/').pop();
      sequence = parseInt(lastSequence || '0', 10) + 1;
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }
}
