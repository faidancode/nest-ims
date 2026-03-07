import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PurchaseOrder } from './purchase-order.entity';
import { PurchaseOrdersService } from './purchase-orders.service';

describe('PurchaseOrdersServiceTest', () => {
  let service: PurchaseOrdersService;
  let auditLogsService: jest.Mocked<Pick<AuditLogsService, 'create'>>;
  let purchaseOrderRepository: jest.Mocked<
    Pick<Repository<PurchaseOrder>, 'findAndCount' | 'findOne' | 'save' | 'create'>
  >;

  beforeEach(async () => {
    auditLogsService = {
      create: jest.fn(),
    };

    purchaseOrderRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        {
          provide: getRepositoryToken(PurchaseOrder),
          useValue: purchaseOrderRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('PurchaseOrdersServiceTest_FindAll', () => {
    it('should return paginated purchase orders', async () => {
      const rows = [{ id: 'po-1', poNumber: 'PO-001' }] as PurchaseOrder[];
      purchaseOrderRepository.findAndCount.mockResolvedValue([rows, 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: undefined,
        sort: 'poNumber:asc',
      });

      expect(purchaseOrderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: IsNull() },
          order: { poNumber: 'ASC' },
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

    it('should apply search term when listing purchase orders', async () => {
      purchaseOrderRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: 'PO-001',
        sort: 'createdAt:desc',
      });

      expect(purchaseOrderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { deletedAt: IsNull(), poNumber: Like('%PO-001%') },
            { deletedAt: IsNull(), supplierId: Like('%PO-001%') },
          ],
        }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw error when repository fails', async () => {
        purchaseOrderRepository.findAndCount.mockRejectedValue(
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
    });
  });

  describe('PurchaseOrdersServiceTest_FindOne', () => {
    it('should return purchase order by id', async () => {
      purchaseOrderRepository.findOne.mockResolvedValue({
        id: 'po-1',
      } as PurchaseOrder);

      const result = await service.findOne('po-1');

      expect(purchaseOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'po-1', deletedAt: IsNull() },
      });
      expect(result).toEqual({ id: 'po-1' });
    });

    describe('Negative Scenarios', () => {
      it('should throw when purchase order not found', async () => {
        purchaseOrderRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('PurchaseOrdersServiceTest_Create', () => {
    it('should create purchase order when number does not exist', async () => {
      purchaseOrderRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'po-1' } as PurchaseOrder);
      purchaseOrderRepository.create.mockReturnValue({ id: 'po-1' } as PurchaseOrder);
      purchaseOrderRepository.save.mockResolvedValue({ id: 'po-1' } as PurchaseOrder);

      const result = await service.create({
        poNumber: 'PO-001',
        supplierId: '11111111-1111-4111-8111-111111111111',
        status: 'DRAFT',
      });

      expect(purchaseOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          poNumber: 'PO-001',
          supplierId: '11111111-1111-4111-8111-111111111111',
          status: 'DRAFT',
        }),
      );
      expect(purchaseOrderRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 'po-1' });
    });

    describe('Negative Scenarios', () => {
      it('should throw when creating with duplicate active PO number', async () => {
        purchaseOrderRepository.findOne.mockResolvedValue({
          id: 'po-1',
          poNumber: 'PO-001',
          deletedAt: null,
        } as PurchaseOrder);

        await expect(
          service.create({
            poNumber: 'PO-001',
            supplierId: '11111111-1111-4111-8111-111111111111',
            status: 'DRAFT',
          }),
        ).rejects.toThrow(ConflictException);
      });
    });
  });

  describe('PurchaseOrdersServiceTest_Update', () => {
    it('should update purchase order', async () => {
      const existing = {
        id: 'po-1',
        poNumber: 'PO-001',
        supplierId: '11111111-1111-4111-8111-111111111111',
        status: 'DRAFT',
        orderDate: new Date(),
        deletedAt: null,
      } as PurchaseOrder;

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      purchaseOrderRepository.findOne.mockResolvedValue(null);
      purchaseOrderRepository.save.mockResolvedValue(existing);

      await service.update('po-1', {
        poNumber: 'PO-002',
        status: 'RECEIVED',
      });

      expect(purchaseOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          poNumber: 'PO-002',
          status: 'RECEIVED',
        }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw when updating PO number to existing active number', async () => {
        const existing = {
          id: 'po-1',
          poNumber: 'PO-001',
          status: 'DRAFT',
          orderDate: new Date(),
          deletedAt: null,
        } as PurchaseOrder;

        jest.spyOn(service, 'findOne').mockResolvedValue(existing);
        purchaseOrderRepository.findOne.mockResolvedValue({
          id: 'po-2',
          poNumber: 'PO-002',
          deletedAt: null,
        } as PurchaseOrder);

        await expect(
          service.update('po-1', { poNumber: 'PO-002' }),
        ).rejects.toThrow(ConflictException);
      });
    });
  });

  describe('PurchaseOrdersServiceTest_Remove', () => {
    it('should soft delete purchase order', async () => {
      const existing = {
        id: 'po-1',
        poNumber: 'PO-001',
        deletedAt: null,
      } as PurchaseOrder;

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      purchaseOrderRepository.save.mockResolvedValue(existing);

      await service.remove('po-1');

      expect(purchaseOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw when purchase order to remove is not found', async () => {
        jest
          .spyOn(service, 'findOne')
          .mockRejectedValue(new NotFoundException('Purchase order not found'));

        await expect(service.remove('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });
});
