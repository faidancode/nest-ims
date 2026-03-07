import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { FindOptionsWhere, IsNull, Like, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BillOfMaterial } from './bill-of-material.entity';
import {
  CreateBillOfMaterialInput,
  ListBillOfMaterialsQuery,
  UpdateBillOfMaterialInput,
} from './bill-of-materials.schema';

@Injectable()
export class BillOfMaterialsService {
  constructor(
    @InjectRepository(BillOfMaterial)
    private readonly billOfMaterialRepository: Repository<BillOfMaterial>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private toAuditValues(entry: BillOfMaterial) {
    return {
      id: entry.id,
      finishedPartId: entry.finishedPartId,
      rawPartId: entry.rawPartId,
      quantity: entry.quantity,
      unit: entry.unit,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      deletedAt: entry.deletedAt,
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
        tableName: 'bill_of_materials',
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

    if (sortField === 'finishedPartId') {
      return { finishedPartId: sortDir };
    }

    if (sortField === 'rawPartId') {
      return { rawPartId: sortDir };
    }

    if (sortField === 'unit') {
      return { unit: sortDir };
    }

    return { createdAt: sortDir };
  }

  private buildWhere(
    search?: string,
    q?: string,
  ): FindOptionsWhere<BillOfMaterial> | FindOptionsWhere<BillOfMaterial>[] {
    const term = search?.trim() || q?.trim();

    if (!term) {
      return { deletedAt: IsNull() };
    }

    return [
      { deletedAt: IsNull(), finishedPartId: Like(`%${term}%`) },
      { deletedAt: IsNull(), rawPartId: Like(`%${term}%`) },
      { deletedAt: IsNull(), unit: Like(`%${term}%`) },
    ];
  }

  async findAll(query: ListBillOfMaterialsQuery) {
    const { page, limit, q, search, sort } = query;
    const where = this.buildWhere(search, q);
    const order = this.resolveOrder(sort);
    const skip = (page - 1) * limit;

    const [data, total] = await this.billOfMaterialRepository.findAndCount({
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

  async findOne(id: string): Promise<BillOfMaterial> {
    const entry = await this.billOfMaterialRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!entry) {
      throw new NotFoundException('Bill of material not found');
    }

    return entry;
  }

  async create(input: CreateBillOfMaterialInput): Promise<BillOfMaterial> {
    const existing = await this.billOfMaterialRepository.findOne({
      where: {
        finishedPartId: input.finishedPartId,
        rawPartId: input.rawPartId,
      },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        'BOM entry for finished part and raw part already exists',
      );
    }

    if (existing && existing.deletedAt) {
      const oldValues = this.toAuditValues(existing);
      existing.quantity = input.quantity.toFixed(4);
      existing.unit = input.unit;
      existing.deletedAt = null;
      await this.billOfMaterialRepository.save(existing);
      await this.writeAuditLog({
        recordId: existing.id,
        action: 'UPDATE',
        oldValues,
        newValues: this.toAuditValues(existing),
      });
      return this.findOne(existing.id);
    }

    const entity = this.billOfMaterialRepository.create({
      id: randomUUID(),
      finishedPartId: input.finishedPartId,
      rawPartId: input.rawPartId,
      quantity: input.quantity.toFixed(4),
      unit: input.unit,
    });

    await this.billOfMaterialRepository.save(entity);
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
    input: UpdateBillOfMaterialInput,
  ): Promise<BillOfMaterial> {
    const existing = await this.findOne(id);
    const oldValues = this.toAuditValues(existing);

    const nextFinishedPartId = input.finishedPartId ?? existing.finishedPartId;
    const nextRawPartId = input.rawPartId ?? existing.rawPartId;

    if (
      nextFinishedPartId !== existing.finishedPartId ||
      nextRawPartId !== existing.rawPartId
    ) {
      const duplicate = await this.billOfMaterialRepository.findOne({
        where: {
          finishedPartId: nextFinishedPartId,
          rawPartId: nextRawPartId,
          deletedAt: IsNull(),
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'BOM entry for finished part and raw part already exists',
        );
      }
    }

    existing.finishedPartId = nextFinishedPartId;
    existing.rawPartId = nextRawPartId;
    existing.quantity =
      typeof input.quantity === 'number'
        ? input.quantity.toFixed(4)
        : existing.quantity;
    existing.unit = input.unit ?? existing.unit;

    await this.billOfMaterialRepository.save(existing);
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
    await this.billOfMaterialRepository.save(existing);
    await this.writeAuditLog({
      recordId: existing.id,
      action: 'DELETE',
      oldValues,
      newValues: this.toAuditValues(existing),
    });
  }
}

