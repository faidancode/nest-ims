import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { FindOptionsWhere, IsNull, Like, Repository } from 'typeorm';
import { PurchaseOrder, PurchaseOrderStatus } from './purchase-order.entity';
import {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersQuery,
  UpdatePurchaseOrderInput,
} from './purchase-orders.schema';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
  ) {}

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
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    return purchaseOrder;
  }

  async create(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
    const existing = await this.purchaseOrderRepository.findOne({
      where: { poNumber: input.poNumber },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException('PO number already exists');
    }

    if (existing && existing.deletedAt) {
      existing.supplierId = input.supplierId;
      existing.status = input.status ?? 'DRAFT';
      existing.orderDate = input.orderDate
        ? new Date(input.orderDate)
        : new Date();
      existing.expectedDate = input.expectedDate
        ? new Date(input.expectedDate)
        : null;
      existing.notes = input.notes ?? null;
      existing.deletedAt = null;
      await this.purchaseOrderRepository.save(existing);
      return this.findOne(existing.id);
    }

    const entity = this.purchaseOrderRepository.create({
      id: randomUUID(),
      poNumber: input.poNumber,
      supplierId: input.supplierId,
      status: input.status ?? 'DRAFT',
      orderDate: input.orderDate ? new Date(input.orderDate) : new Date(),
      expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
      notes: input.notes ?? null,
    });

    await this.purchaseOrderRepository.save(entity);
    return this.findOne(entity.id);
  }

  async update(
    id: string,
    input: UpdatePurchaseOrderInput,
  ): Promise<PurchaseOrder> {
    const existing = await this.findOne(id);

    if (input.poNumber && input.poNumber !== existing.poNumber) {
      const duplicate = await this.purchaseOrderRepository.findOne({
        where: { poNumber: input.poNumber, deletedAt: IsNull() },
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

    await this.purchaseOrderRepository.save(existing);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    existing.deletedAt = new Date();
    await this.purchaseOrderRepository.save(existing);
  }
}
