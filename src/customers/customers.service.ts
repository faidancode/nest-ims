import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { FindOptionsWhere, IsNull, Like, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Customer } from './customer.entity';
import {
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from './customers.schema';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private toAuditValues(customer: Customer) {
    return {
      id: customer.id,
      name: customer.name,
      contactName: customer.contactName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      deletedAt: customer.deletedAt,
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
        tableName: 'customers',
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
  ): FindOptionsWhere<Customer> | FindOptionsWhere<Customer>[] {
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

  async findAll(query: ListCustomersQuery) {
    const { page, limit, q, search, sort } = query;
    const where = this.buildWhere(search, q);
    const order = this.resolveOrder(sort);
    const skip = (page - 1) * limit;

    const [data, total] = await this.customerRepository.findAndCount({
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

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const existing = await this.customerRepository.findOne({
      where: { name: input.name },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException('Customer name already exists');
    }

    if (existing && existing.deletedAt) {
      const oldValues = this.toAuditValues(existing);
      existing.contactName = input.contactName ?? null;
      existing.email = input.email ?? null;
      existing.phone = input.phone ?? null;
      existing.address = input.address ?? null;
      existing.isActive = input.active ?? true;
      existing.deletedAt = null;
      await this.customerRepository.save(existing);
      await this.writeAuditLog({
        recordId: existing.id,
        action: 'UPDATE',
        oldValues,
        newValues: this.toAuditValues(existing),
      });
      return this.findOne(existing.id);
    }

    const entity = this.customerRepository.create({
      id: randomUUID(),
      name: input.name,
      contactName: input.contactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      isActive: input.active ?? true,
    });

    await this.customerRepository.save(entity);
    await this.writeAuditLog({
      recordId: entity.id,
      action: 'INSERT',
      newValues: this.toAuditValues(entity),
    });
    return this.findOne(entity.id);
  }

  async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const existing = await this.findOne(id);
    const oldValues = this.toAuditValues(existing);

    if (input.name && input.name !== existing.name) {
      const duplicate = await this.customerRepository.findOne({
        where: { name: input.name, deletedAt: IsNull() },
      });

      if (duplicate) {
        throw new ConflictException('Customer name already exists');
      }
    }

    existing.name = input.name ?? existing.name;
    existing.contactName = input.contactName ?? existing.contactName;
    existing.email = input.email ?? existing.email;
    existing.phone = input.phone ?? existing.phone;
    existing.address = input.address ?? existing.address;
    existing.isActive =
      typeof input.active === 'boolean' ? input.active : existing.isActive;

    await this.customerRepository.save(existing);
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
    await this.customerRepository.save(existing);
    await this.writeAuditLog({
      recordId: existing.id,
      action: 'DELETE',
      oldValues,
      newValues: this.toAuditValues(existing),
    });
  }
}
