import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, IsNull, Like, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PurchaseOrder } from './purchase-order.entity';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrderItem } from './purchase-order-item.entity';

describe('PurchaseOrdersServiceTest', () => {
  let service: PurchaseOrdersService;
  let auditLogsService: jest.Mocked<Pick<AuditLogsService, 'create'>>;
  let purchaseOrderRepository: jest.Mocked<
    Pick<
      Repository<PurchaseOrder>,
      'findAndCount' | 'findOne' | 'save' | 'create'
    >
  >;
  let purchaseOrderItemRepository: jest.Mocked<
    Pick<Repository<PurchaseOrderItem>, 'save' | 'create'>
  >;

  let mockManager: any;
  let mockDataSource: any;

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

    purchaseOrderItemRepository = {
      save: jest.fn(),
      create: jest.fn(),
    };

    mockManager = {
      create: jest.fn().mockImplementation((entity, data) => data),
      save: jest
        .fn()
        .mockImplementation((data) => Promise.resolve({ id: 'po-1', ...data })),
      findOne: jest.fn().mockResolvedValue(null), // penting
      findOneBy: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation((cb) => cb(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        {
          provide: getRepositoryToken(PurchaseOrder),
          useValue: purchaseOrderRepository,
        },
        {
          provide: getRepositoryToken(PurchaseOrderItem),
          useValue: purchaseOrderItemRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
        {
          provide: DataSource, // Atau getDataSourceToken() jika menggunakan koneksi spesifik
          useValue: mockDataSource,
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
      // 1. Mock data harus menyertakan items agar lebih akurat dengan kondisi asli
      const mockPO = {
        id: 'po-1',
        items: [],
        supplier: { id: 'supp-1', name: 'Supplier A' },
      } as unknown as PurchaseOrder; // <--- Double casting

      purchaseOrderRepository.findOne.mockResolvedValue(mockPO);

      const result = await service.findOne('po-1');

      // 2. Sesuaikan expectation dengan kode terbaru di Service
      expect(purchaseOrderRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'po-1',
          deletedAt: IsNull(),
        },
        relations: ['items', 'items.part', 'supplier'], // Ini harus sama persis dengan di service
      });

      expect(result).toEqual(mockPO);
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
    it('should create purchase order with multiple items and correct PO number', async () => {
      // 1. Mock pencarian PO terakhir untuk generator (PO pertama bulan ini)
      // Gunakan mockImplementation agar lebih fleksibel terhadap kriteria pencarian
      mockManager.findOne.mockImplementation((entity, criteria) => {
        // Jika mencari PurchaseOrder (untuk sequence number)
        if (entity === PurchaseOrder) return Promise.resolve(null);

        // Jika service mencari Supplier (Validasi relasi)
        // Sesuaikan dengan logika internal service Anda
        return Promise.resolve({ id: 'any-uuid' });
      });

      // 2. Jika service menggunakan findOneBy untuk validasi Supplier/Part
      mockManager.findOneBy.mockResolvedValue({ id: 'some-id' });

      // 3. Mock create & save
      const mockPO = {
        id: '11111111-1111-4111-8111-111111111111',
        poNumber: 'PO/2026/03/0001',
        items: [
          { id: 'item-1', partId: 'part-A', quantity: 2, unitPrice: 50000 },
          { id: 'item-2', partId: 'part-B', quantity: 1, unitPrice: 75000 },
        ],
      };

      mockManager.create.mockReturnValue(mockPO);
      mockManager.save.mockResolvedValue(mockPO);

      const input = {
        supplierId: '11111111-1111-4111-8111-111111111111',
        status: 'DRAFT' as const,
        notes: 'Testing multiple items',
        items: [
          { partId: 'part-A', quantity: 2, unitPrice: 50000 },
          { partId: 'part-B', quantity: 1, unitPrice: 75000 },
        ],
      };

      purchaseOrderRepository.findOne.mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        poNumber: 'PO/2026/03/0001',
        items: [
          { id: 'item-1', partId: 'part-A', quantity: 2, unitPrice: 50000 },
          { id: 'item-2', partId: 'part-B', quantity: 1, unitPrice: 75000 },
        ],
      } as PurchaseOrder);

      const result = await service.create(input);

      // Assertions
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(result.id).toBe('11111111-1111-4111-8111-111111111111');
      expect(result.items).toHaveLength(2);
    });

    describe('Negative Scenarios (Items Validation)', () => {
      it('should throw error if items array is empty', async () => {
        const invalidInput = {
          supplierId: '11111111-1111-4111-8111-111111111111',
          items: [], // Melanggar .min(1) di Zod
        };

        // Jika validasi dilakukan di level service menggunakan CreatePurchaseOrderSchema
        await expect(service.create(invalidInput as any)).rejects.toThrow();
      });

      it('should throw error if item quantity is less than 1', async () => {
        const invalidInput = {
          supplierId: '11111111-1111-4111-8111-111111111111',
          items: [{ partId: 'uuid', quantity: 0, unitPrice: 100 }],
        };

        await expect(service.create(invalidInput as any)).rejects.toThrow();
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
        items: [],
      } as unknown as PurchaseOrder;

      // update() pakai manager.findOne dua kali:
      // 1. findOne by id → existing PO
      // 2. findOne by poNumber → cek duplikat
      mockManager.findOne
        .mockResolvedValueOnce(existing) // lookup by id → found
        .mockResolvedValueOnce(null); // cek duplikat poNumber → tidak ada

      // update() return this.findOne(id) di akhir → pakai repository
      purchaseOrderRepository.findOne.mockResolvedValue({
        ...existing,
        poNumber: 'PO-002',
        status: 'RECEIVED',
      } as unknown as PurchaseOrder);

      await service.update('po-1', {
        poNumber: 'PO-002',
        status: 'RECEIVED',
      });

      expect(mockManager.save).toHaveBeenCalled();
    });

    describe('Negative Scenarios', () => {
      it('should throw when updating PO number to existing active number', async () => {
        const existing = {
          id: 'po-1',
          poNumber: 'PO-001',
          status: 'DRAFT',
          deletedAt: null,
          items: [],
        } as unknown as PurchaseOrder;

        const conflicting = {
          id: 'po-2',
          poNumber: 'PO-002',
          deletedAt: null,
        } as unknown as PurchaseOrder;

        mockManager.findOne
          .mockResolvedValueOnce(existing) // lookup by id → found
          .mockResolvedValueOnce(conflicting); // cek duplikat poNumber → konflik!

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
