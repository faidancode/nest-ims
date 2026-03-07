import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { FindOptionsWhere, IsNull, Like, Repository } from 'typeorm';
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
  ) {}

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
      existing.customerId = input.customerId;
      existing.status = input.status ?? 'DRAFT';
      existing.orderDate = input.orderDate ? new Date(input.orderDate) : new Date();
      existing.expectedDate = input.expectedDate ? new Date(input.expectedDate) : null;
      existing.notes = input.notes ?? null;
      existing.deletedAt = null;
      await this.salesOrderRepository.save(existing);
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
    return this.findOne(entity.id);
  }

  async update(id: string, input: UpdateSalesOrderInput): Promise<SalesOrder> {
    const existing = await this.findOne(id);

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
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    existing.deletedAt = new Date();
    await this.salesOrderRepository.save(existing);
  }
}
