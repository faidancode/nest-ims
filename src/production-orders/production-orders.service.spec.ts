import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProductionOrder } from './production-order.entity';
import { ProductionOrdersService } from './production-orders.service';

describe('ProductionOrdersServiceTest', () => {
  let service: ProductionOrdersService;
  let auditLogsService: jest.Mocked<Pick<AuditLogsService, 'create'>>;
  let repository: jest.Mocked<
    Pick<Repository<ProductionOrder>, 'findAndCount' | 'findOne' | 'save' | 'create'>
  >;

  beforeEach(async () => {
    repository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    auditLogsService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrdersService,
        { provide: getRepositoryToken(ProductionOrder), useValue: repository },
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compile();

    service = module.get<ProductionOrdersService>(ProductionOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list production orders', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);
    await service.findAll({
      page: 1,
      limit: 10,
      q: undefined,
      search: undefined,
      sort: 'createdAt:desc',
    });
    expect(repository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: IsNull() } }),
    );
  });

  it('should create production order', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'prd-1' } as ProductionOrder);
    repository.create.mockReturnValue({ id: 'prd-1' } as ProductionOrder);
    repository.save.mockResolvedValue({ id: 'prd-1' } as ProductionOrder);

    const result = await service.create({
      poNumber: 'PROD-001',
      finishedPartId: '11111111-1111-4111-8111-111111111111',
      warehouseId: '22222222-2222-4222-8222-222222222222',
      quantity: 3,
      status: 'DRAFT',
      productionDate: undefined,
      notes: undefined,
    });

    expect(result).toEqual({ id: 'prd-1' });
  });

  it('should throw duplicate active production order number', async () => {
    repository.findOne.mockResolvedValue({
      id: 'prd-1',
      deletedAt: null,
    } as ProductionOrder);
    await expect(
      service.create({
        poNumber: 'PROD-001',
        finishedPartId: '11111111-1111-4111-8111-111111111111',
        warehouseId: '22222222-2222-4222-8222-222222222222',
        quantity: 1,
        status: 'DRAFT',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw when production order not found', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});

