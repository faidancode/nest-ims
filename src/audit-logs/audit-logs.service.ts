import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { AuditLog, AuditLogAction } from './audit-log.entity';
import {
  CreateAuditLogInput,
  ListAuditLogsQuery,
} from './audit-logs.schema';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  private resolveOrder(sort: string): Record<string, 'ASC' | 'DESC'> {
    const [sortField, sortDirRaw] = sort.split(':');
    const sortDir = sortDirRaw?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    if (sortField === 'tableName') {
      return { tableName: sortDir };
    }

    if (sortField === 'action') {
      return { action: sortDir };
    }

    if (sortField === 'recordId') {
      return { recordId: sortDir };
    }

    return { createdAt: sortDir };
  }

  private buildWhere(
    query: ListAuditLogsQuery,
  ): FindOptionsWhere<AuditLog> | FindOptionsWhere<AuditLog>[] {
    const term = query.search?.trim() || query.q?.trim();
    const baseWhere: FindOptionsWhere<AuditLog> = {};

    if (query.tableName?.trim()) {
      baseWhere.tableName = query.tableName.trim();
    }

    if (query.recordId) {
      baseWhere.recordId = query.recordId;
    }

    if (query.userId) {
      baseWhere.userId = query.userId;
    }

    if (query.action) {
      baseWhere.action = query.action;
    }

    if (query.dateFrom && query.dateTo) {
      baseWhere.createdAt = Between(
        new Date(query.dateFrom),
        new Date(query.dateTo),
      );
    } else if (query.dateFrom) {
      baseWhere.createdAt = MoreThanOrEqual(new Date(query.dateFrom));
    } else if (query.dateTo) {
      baseWhere.createdAt = LessThanOrEqual(new Date(query.dateTo));
    }

    if (!term) {
      return baseWhere;
    }

    const validActions: AuditLogAction[] = [
      'INSERT',
      'UPDATE',
      'DELETE',
      'APPROVE',
      'STATUS_CHANGE',
    ];
    const actionTerm = term.toUpperCase() as AuditLogAction;
    const where: FindOptionsWhere<AuditLog>[] = [
      { ...baseWhere, tableName: Like(`%${term}%`) },
      { ...baseWhere, recordId: Like(`%${term}%`) },
      { ...baseWhere, userId: Like(`%${term}%`) },
    ];

    if (validActions.includes(actionTerm)) {
      where.push({ ...baseWhere, action: actionTerm });
    }

    return where;
  }

  async findAll(query: ListAuditLogsQuery) {
    const { page, limit, sort } = query;
    const where = this.buildWhere(query);
    const order = this.resolveOrder(sort);
    const skip = (page - 1) * limit;

    const [data, total] = await this.auditLogRepository.findAndCount({
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

  async findOne(id: string): Promise<AuditLog> {
    const auditLog = await this.auditLogRepository.findOne({
      where: { id },
    });

    if (!auditLog) {
      throw new NotFoundException('Audit log not found');
    }

    return auditLog;
  }

  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const entity = this.auditLogRepository.create({
      id: randomUUID(),
      userId: input.userId ?? null,
      tableName: input.tableName,
      recordId: input.recordId,
      action: input.action,
      oldValues: input.oldValues ?? null,
      newValues: input.newValues ?? null,
    });

    await this.auditLogRepository.save(entity);
    return this.findOne(entity.id);
  }
}
