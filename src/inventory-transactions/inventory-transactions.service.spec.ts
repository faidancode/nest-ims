import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { InventoryTransaction } from './inventory-transaction.entity';
import { InventoryTransactionsService } from './inventory-transactions.service';

describe('InventoryTransactionsServiceTest', () => {
  let service: InventoryTransactionsService;
  let auditLogsService: jest.Mocked<Pick<AuditLogsService, 'create'>>;
  let inventoryTransactionRepository: jest.Mocked<
    Pick<
      Repository<InventoryTransaction>,
      'findAndCount' | 'findOne' | 'save' | 'create'
    >
  >;

  beforeEach(async () => {
    auditLogsService = {
      create: jest.fn(),
    };

    inventoryTransactionRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryTransactionsService,
        {
          provide: getRepositoryToken(InventoryTransaction),
          useValue: inventoryTransactionRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<InventoryTransactionsService>(
      InventoryTransactionsService,
    );
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('InventoryTransactionsServiceTest_FindAll', () => {
    it('should return paginated inventory transactions', async () => {
      const rows = [{ id: 'txn-1', type: 'IN' }] as InventoryTransaction[];
      inventoryTransactionRepository.findAndCount.mockResolvedValue([rows, 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: undefined,
        sort: 'type:asc',
      });

      expect(inventoryTransactionRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: IsNull() },
          order: { type: 'ASC' },
          skip: 0,
          take: 10,
        }),
      );
      expect(result).toEqual({
        data: rows,
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('should apply search term when listing inventory transactions', async () => {
      inventoryTransactionRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: 'part-1',
        sort: 'createdAt:desc',
      });

      expect(inventoryTransactionRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { deletedAt: IsNull(), partId: Like('%part-1%') },
            { deletedAt: IsNull(), warehouseId: Like('%part-1%') },
            { deletedAt: IsNull(), referenceId: Like('%part-1%') },
            { deletedAt: IsNull(), notes: Like('%part-1%') },
          ],
        }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw error when repository fails', async () => {
        inventoryTransactionRepository.findAndCount.mockRejectedValue(
          new Error('DB failure'),
        );

        await expect(
          service.findAll({
            page: 1,
            limit: 10,
            q: undefined,
            search: undefined,
            sort: 'createdAt:desc',
          }),
        ).rejects.toThrow('DB failure');
      });

      it('should handle invalid search terms gracefully', async () => {
        inventoryTransactionRepository.findAndCount.mockResolvedValue([[], 0]);

        await service.findAll({
          page: 1,
          limit: 10,
          q: undefined,
          search: '   ',
          sort: 'createdAt:desc',
        });

        expect(inventoryTransactionRepository.findAndCount).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { deletedAt: IsNull() },
          }),
        );
      });
    });
  });

  describe('InventoryTransactionsServiceTest_FindOne', () => {
    it('should return inventory transaction by id', async () => {
      inventoryTransactionRepository.findOne.mockResolvedValue({
        id: 'txn-1',
      } as InventoryTransaction);

      const result = await service.findOne('txn-1');

      expect(inventoryTransactionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'txn-1', deletedAt: IsNull() },
      });
      expect(result).toEqual({ id: 'txn-1' });
    });

    describe('Negative Scenarios', () => {
      it('should throw when inventory transaction not found', async () => {
        inventoryTransactionRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('InventoryTransactionsServiceTest_Create', () => {
    it('should create inventory transaction', async () => {
      inventoryTransactionRepository.findOne.mockResolvedValueOnce({
        id: 'txn-1',
      } as InventoryTransaction);
      inventoryTransactionRepository.create.mockReturnValue({
        id: 'txn-1',
      } as InventoryTransaction);
      inventoryTransactionRepository.save.mockResolvedValue({
        id: 'txn-1',
      } as InventoryTransaction);

      const result = await service.create({
        partId: '11111111-1111-4111-8111-111111111111',
        warehouseId: '22222222-2222-4222-8222-222222222222',
        type: 'IN',
        referenceType: 'PO',
        referenceId: '33333333-3333-4333-8333-333333333333',
        quantity: 5,
        quantityBefore: 10,
        quantityAfter: 15,
        notes: 'Incoming stock',
      });

      expect(inventoryTransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          partId: '11111111-1111-4111-8111-111111111111',
          warehouseId: '22222222-2222-4222-8222-222222222222',
          type: 'IN',
          referenceType: 'PO',
          referenceId: '33333333-3333-4333-8333-333333333333',
          quantity: '5.0000',
          quantityBefore: '10.0000',
          quantityAfter: '15.0000',
          notes: 'Incoming stock',
        }),
      );
      expect(inventoryTransactionRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 'txn-1' });
    });

    describe('Negative Scenarios', () => {
      it('should throw when repository save fails on create', async () => {
        inventoryTransactionRepository.create.mockReturnValue({
          id: 'txn-1',
        } as InventoryTransaction);
        inventoryTransactionRepository.save.mockRejectedValue(
          new Error('DB failure'),
        );

        await expect(
          service.create({
            partId: '11111111-1111-4111-8111-111111111111',
            warehouseId: '22222222-2222-4222-8222-222222222222',
            type: 'IN',
            referenceType: 'PO',
            referenceId: '33333333-3333-4333-8333-333333333333',
            quantity: 5,
            quantityBefore: 10,
            quantityAfter: 15,
            notes: 'Incoming stock',
          }),
        ).rejects.toThrow('DB failure');
      });
    });
  });

  describe('InventoryTransactionsServiceTest_Update', () => {
    it('should update inventory transaction', async () => {
      const existing = {
        id: 'txn-1',
        partId: '11111111-1111-4111-8111-111111111111',
        warehouseId: '22222222-2222-4222-8222-222222222222',
        type: 'IN',
        referenceType: 'PO',
        referenceId: '33333333-3333-4333-8333-333333333333',
        quantity: '5.0000',
        quantityBefore: '10.0000',
        quantityAfter: '15.0000',
        notes: 'Incoming stock',
        deletedAt: null,
      } as InventoryTransaction;

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      inventoryTransactionRepository.save.mockResolvedValue(existing);

      await service.update('txn-1', {
        type: 'OUT',
        quantity: 2,
        quantityBefore: 15,
        quantityAfter: 13,
        notes: 'Outgoing stock',
      });

      expect(inventoryTransactionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'OUT',
          quantity: '2.0000',
          quantityBefore: '15.0000',
          quantityAfter: '13.0000',
          notes: 'Outgoing stock',
        }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw when inventory transaction to update is not found', async () => {
        jest
          .spyOn(service, 'findOne')
          .mockRejectedValue(
            new NotFoundException('Inventory transaction not found'),
          );

        await expect(
          service.update('missing', {
            type: 'OUT',
          }),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('InventoryTransactionsServiceTest_Remove', () => {
    it('should soft delete inventory transaction', async () => {
      const existing = {
        id: 'txn-1',
        deletedAt: null,
      } as InventoryTransaction;

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      inventoryTransactionRepository.save.mockResolvedValue(existing);

      await service.remove('txn-1');

      expect(inventoryTransactionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw when inventory transaction to remove is not found', async () => {
        jest
          .spyOn(service, 'findOne')
          .mockRejectedValue(
            new NotFoundException('Inventory transaction not found'),
          );

        await expect(service.remove('missing')).rejects.toThrow(
          NotFoundException,
        );
        expect(inventoryTransactionRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});
