import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { FindOptionsWhere, IsNull, Like, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Part } from './part.entity';
import {
  CreatePartInput,
  ListPartsQuery,
  UpdatePartInput,
} from './parts.schema';

@Injectable()
export class PartsService {
  constructor(
    @InjectRepository(Part)
    private readonly partRepository: Repository<Part>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private toAuditValues(part: Part) {
    return {
      id: part.id,
      partNumber: part.partNumber,
      name: part.name,
      description: part.description,
      type: part.type,
      unit: part.unit,
      createdAt: part.createdAt,
      updatedAt: part.updatedAt,
      deletedAt: part.deletedAt,
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
        tableName: 'parts',
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

    if (sortField === 'partNumber') {
      return { partNumber: sortDir };
    }

    if (sortField === 'name') {
      return { name: sortDir };
    }

    if (sortField === 'type') {
      return { type: sortDir };
    }

    if (sortField === 'unit') {
      return { unit: sortDir };
    }

    return { createdAt: sortDir };
  }

  private buildWhere(
    search?: string,
    q?: string,
  ): FindOptionsWhere<Part> | FindOptionsWhere<Part>[] {
    const term = (search ?? q)?.trim();

    if (!term) {
      return { deletedAt: IsNull() };
    }

    return [
      {
        deletedAt: IsNull(),
        partNumber: Like(`%${term}%`),
      },
      {
        deletedAt: IsNull(),
        name: Like(`%${term}%`),
      },
    ];
  }

  async findAll(query: ListPartsQuery) {
    const { page, limit, q, search, sort } = query;
    const where = this.buildWhere(search, q);
    const order = this.resolveOrder(sort);
    const skip = (page - 1) * limit;

    const [data, total] = await this.partRepository.findAndCount({
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

  async findOne(id: string): Promise<Part> {
    const part = await this.partRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
    });

    if (!part) {
      throw new NotFoundException('Part not found');
    }

    return part;
  }

  async create(input: CreatePartInput): Promise<Part> {
    const existing = await this.partRepository.findOne({
      where: { partNumber: input.partNumber },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException('Part number already exists');
    }

    if (existing && existing.deletedAt) {
      const oldValues = this.toAuditValues(existing);
      existing.name = input.name;
      existing.description = input.description ?? null;
      existing.type = input.type;
      existing.unit = input.unit;
      existing.deletedAt = null;
      await this.partRepository.save(existing);
      await this.writeAuditLog({
        recordId: existing.id,
        action: 'UPDATE',
        oldValues,
        newValues: this.toAuditValues(existing),
      });
      return this.findOne(existing.id);
    }

    const entity = this.partRepository.create({
      id: randomUUID(),
      partNumber: input.partNumber,
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      unit: input.unit,
    });

    await this.partRepository.save(entity);
    await this.writeAuditLog({
      recordId: entity.id,
      action: 'INSERT',
      newValues: this.toAuditValues(entity),
    });
    return this.findOne(entity.id);
  }

  async update(id: string, input: UpdatePartInput): Promise<Part> {
    const existing = await this.findOne(id);
    const oldValues = this.toAuditValues(existing);

    if (input.partNumber && input.partNumber !== existing.partNumber) {
      const duplicate = await this.partRepository.findOne({
        where: { partNumber: input.partNumber, deletedAt: IsNull() },
      });

      if (duplicate) {
        throw new ConflictException('Part number already exists');
      }
    }

    existing.partNumber = input.partNumber ?? existing.partNumber;
    existing.name = input.name ?? existing.name;
    existing.description = input.description ?? existing.description;
    existing.type = input.type ?? existing.type;
    existing.unit = input.unit ?? existing.unit;

    await this.partRepository.save(existing);
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
    await this.partRepository.save(existing);
    await this.writeAuditLog({
      recordId: existing.id,
      action: 'DELETE',
      oldValues,
      newValues: this.toAuditValues(existing),
    });
  }
}
