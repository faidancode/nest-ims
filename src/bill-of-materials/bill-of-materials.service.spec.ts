import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BillOfMaterial } from './bill-of-material.entity';
import { BillOfMaterialsService } from './bill-of-materials.service';

describe('BillOfMaterialsServiceTest', () => {
  let service: BillOfMaterialsService;
  let auditLogsService: jest.Mocked<Pick<AuditLogsService, 'create'>>;
  let repository: jest.Mocked<
    Pick<Repository<BillOfMaterial>, 'findAndCount' | 'findOne' | 'save' | 'create'>
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
        BillOfMaterialsService,
        { provide: getRepositoryToken(BillOfMaterial), useValue: repository },
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compile();

    service = module.get<BillOfMaterialsService>(BillOfMaterialsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list bom entries', async () => {
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

  it('should create bom entry', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'bom-1' } as BillOfMaterial);
    repository.create.mockReturnValue({ id: 'bom-1' } as BillOfMaterial);
    repository.save.mockResolvedValue({ id: 'bom-1' } as BillOfMaterial);

    const result = await service.create({
      finishedPartId: '11111111-1111-4111-8111-111111111111',
      rawPartId: '22222222-2222-4222-8222-222222222222',
      quantity: 2.5,
      unit: 'PCS',
    });

    expect(result).toEqual({ id: 'bom-1' });
  });

  it('should throw duplicate active bom entry on create', async () => {
    repository.findOne.mockResolvedValue({
      id: 'bom-1',
      deletedAt: null,
    } as BillOfMaterial);
    await expect(
      service.create({
        finishedPartId: '11111111-1111-4111-8111-111111111111',
        rawPartId: '22222222-2222-4222-8222-222222222222',
        quantity: 1,
        unit: 'PCS',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw when bom entry not found', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});

