import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsServiceTest', () => {
  let service: AuditLogsService;
  let auditLogRepository: jest.Mocked<
    Pick<Repository<AuditLog>, 'findAndCount' | 'findOne' | 'save' | 'create'>
  >;

  beforeEach(async () => {
    auditLogRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: auditLogRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return paginated audit logs', async () => {
    const rows = [{ id: 'log-1', action: 'INSERT' }] as AuditLog[];
    auditLogRepository.findAndCount.mockResolvedValue([rows, 1]);

    const result = await service.findAll({
      page: 1,
      limit: 10,
      q: undefined,
      search: undefined,
      sort: 'createdAt:desc',
      tableName: undefined,
      recordId: undefined,
      userId: undefined,
      action: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });

    expect(auditLogRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      }),
    );
    expect(result.meta.total).toBe(1);
  });

  it('should apply search term when listing audit logs', async () => {
    auditLogRepository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({
      page: 1,
      limit: 10,
      q: undefined,
      search: 'sales_orders',
      sort: 'createdAt:desc',
      tableName: undefined,
      recordId: undefined,
      userId: undefined,
      action: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });

    expect(auditLogRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [
          { tableName: Like('%sales_orders%') },
          { recordId: Like('%sales_orders%') },
          { userId: Like('%sales_orders%') },
        ],
      }),
    );
  });

  it('should return audit log by id', async () => {
    auditLogRepository.findOne.mockResolvedValue({ id: 'log-1' } as AuditLog);

    const result = await service.findOne('log-1');

    expect(auditLogRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'log-1' },
    });
    expect(result.id).toBe('log-1');
  });

  it('should throw when audit log not found', async () => {
    auditLogRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('should create audit log', async () => {
    auditLogRepository.findOne.mockResolvedValueOnce({ id: 'log-1' } as AuditLog);
    auditLogRepository.create.mockReturnValue({ id: 'log-1' } as AuditLog);
    auditLogRepository.save.mockResolvedValue({ id: 'log-1' } as AuditLog);

    const result = await service.create({
      tableName: 'sales_orders',
      recordId: '11111111-1111-4111-8111-111111111111',
      action: 'INSERT',
      oldValues: undefined,
      newValues: { id: '11111111-1111-4111-8111-111111111111' },
      userId: undefined,
    });

    expect(auditLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tableName: 'sales_orders',
        action: 'INSERT',
      }),
    );
    expect(result.id).toBe('log-1');
  });
});
