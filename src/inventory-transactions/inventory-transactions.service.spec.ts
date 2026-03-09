import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { InventoriesService } from '../inventories/inventories.service';
import { InventoryTransaction } from './inventory-transaction.entity';
import { InventoryTransactionsService } from './inventory-transactions.service';

describe('InventoryTransactionsService', () => {
  let service: InventoryTransactionsService;
  let inventoriesService: jest.Mocked<InventoriesService>;
  let auditLogsService: jest.Mocked<AuditLogsService>;
  let transactionRepo: jest.Mocked<Repository<InventoryTransaction>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryTransactionsService,
        {
          provide: getRepositoryToken(InventoryTransaction),
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: InventoriesService,
          useValue: {
            findByPartAndWarehouse: jest.fn(),
          },
        },
        {
          provide: AuditLogsService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryTransactionsService>(
      InventoryTransactionsService,
    );
    transactionRepo = module.get(getRepositoryToken(InventoryTransaction));
    inventoriesService = module.get(InventoriesService);
    auditLogsService = module.get(AuditLogsService);
  });

  describe('findAll', () => {
    it('should return paginated inventory transactions', async () => {
      const rows = [{ id: 'txn-1', type: 'IN' }] as InventoryTransaction[];
      transactionRepo.findAndCount.mockResolvedValue([rows, 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        sort: 'type:asc',
      });

      expect(transactionRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          order: { type: 'ASC' },
        }),
      );
      expect(result.data).toEqual(rows);
    });
  });

  describe('create', () => {
    const createInput = {
      partId: 'part-123',
      warehouseId: 'wh-123',
      type: 'IN' as const,
      referenceType: 'PO' as const,
      quantity: 5,
      notes: 'Incoming',
    };

    it('should create transaction with calculated quantityBefore and quantityAfter', async () => {
      // 1. Mock saldo awal dari InventoriesService
      inventoriesService.findByPartAndWarehouse.mockResolvedValue({
        quantity: '10.0000',
      } as any);

      // 2. Mock behavior repository
      transactionRepo.create.mockImplementation((dto) => dto as any);
      transactionRepo.save.mockResolvedValue({
        id: 'txn-1',
        ...createInput,
      } as any);
      transactionRepo.findOne.mockResolvedValue({
        id: 'txn-1',
        ...createInput,
      } as any);

      const result = await service.create(createInput);

      // Verifikasi Logika Kalkulasi
      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: '5.0000',
          quantityBefore: '10.0000',
          quantityAfter: '15.0000',
        }),
      );

      expect(transactionRepo.save).toHaveBeenCalled();
      expect(auditLogsService.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle creation when current stock does not exist (default to 0)', async () => {
      inventoriesService.findByPartAndWarehouse.mockResolvedValue(null);
      transactionRepo.create.mockImplementation((dto) => dto as any);
      transactionRepo.findOne.mockResolvedValue({ id: 'txn-new' } as any);

      await service.create(createInput);

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quantityBefore: '0.0000',
          quantityAfter: '5.0000',
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if transaction is missing', async () => {
      transactionRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
