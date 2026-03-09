import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { REQUIRED_PERMISSIONS_KEY } from '../common/constants/rbac-constants';
import { ok, okNoContent } from '../common/http/response';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { CreateInventoryTransactionSchema } from './inventory-transactions.schema';
import { InventoryTransactionsController } from './inventory-transactions.controller';
import { InventoryTransactionsService } from './inventory-transactions.service';

describe('InventoryTransactionsControllerTest', () => {
  let controller: InventoryTransactionsController;
  let service: jest.Mocked<InventoryTransactionsService>;

  beforeEach(async () => {
    const serviceMock: Partial<
      Record<keyof InventoryTransactionsService, unknown>
    > = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryTransactionsController],
      providers: [
        {
          provide: InventoryTransactionsService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InventoryTransactionsController>(
      InventoryTransactionsController,
    );
    service = module.get(
      InventoryTransactionsService,
    ) as jest.Mocked<InventoryTransactionsService>;
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('InventoryTransactionsControllerTest_FindAll', () => {
    it('should return paginated inventory transactions', async () => {
      const payload = {
        data: [],
        meta: { page: 2, limit: 5, total: 0, totalPages: 0 },
      };
      service.findAll.mockResolvedValue(payload as never);

      const result = await controller.findAll({
        page: 2,
        limit: 5,
        sort: 'createdAt:desc',
      } as never);

      expect(service.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        q: undefined,
        search: undefined,
        sort: 'createdAt:desc',
      });
      expect(result).toEqual(payload);
    });

    it('should pass search param to service', async () => {
      service.findAll.mockResolvedValue({ data: [], meta: {} } as never);

      await controller.findAll({
        page: 1,
        limit: 10,
        sort: 'type:asc',
        search: 'part-1',
      } as never);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'part-1' }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw error when service fails', async () => {
        service.findAll.mockRejectedValue(new Error('Service unavailable'));

        await expect(
          controller.findAll({
            page: 1,
            limit: 10,
            sort: 'createdAt:desc',
          } as never),
        ).rejects.toThrow('Service unavailable');
      });
    });
  });

  describe('InventoryTransactionsControllerTest_FindOne', () => {
    it('should return inventory transaction by id', async () => {
      service.findOne.mockResolvedValue({ id: 'txn-1' } as never);

      const result = await controller.findOne('txn-1');

      expect(service.findOne).toHaveBeenCalledWith('txn-1');
      expect(result).toEqual(ok({ id: 'txn-1' }));
    });

    describe('Negative Scenarios', () => {
      it('should throw when inventory transaction is not found', async () => {
        service.findOne.mockRejectedValue(
          new NotFoundException('Inventory transaction not found'),
        );

        await expect(controller.findOne('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('InventoryTransactionsControllerTest_Create', () => {
    it('should create inventory transaction', async () => {
      const payload = { id: 'txn-1' };
      service.create.mockResolvedValue(payload as never);

      const result = await controller.create({
        partId: '11111111-1111-4111-8111-111111111111',
        warehouseId: '22222222-2222-4222-8222-222222222222',
        type: 'IN',
        referenceType: 'PO',
        referenceId: '33333333-3333-4333-8333-333333333333',
        quantity: 5,
        notes: 'Incoming stock',
      });

      expect(service.create).toHaveBeenCalledWith({
        partId: '11111111-1111-4111-8111-111111111111',
        warehouseId: '22222222-2222-4222-8222-222222222222',
        type: 'IN',
        referenceType: 'PO',
        referenceId: '33333333-3333-4333-8333-333333333333',
        quantity: 5,
        notes: 'Incoming stock',
      });
      expect(result).toEqual(ok(payload));
    });

    describe('Negative Scenarios', () => {
      it('should reject invalid create payload via schema', () => {
        const result = CreateInventoryTransactionSchema.safeParse({
          partId: 'invalid-id',
          warehouseId: '22222222-2222-4222-8222-222222222222',
          type: 'IN',
          referenceType: 'PO',
          quantity: 'not-number',
          quantityBefore: 10,
          quantityAfter: 15,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('InventoryTransactionsControllerTest_RBACMetadata', () => {
    it('should require READ permission for findAll and findOne', () => {
      const findAllPermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryTransactionsController.prototype.findAll,
      );
      const findOnePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryTransactionsController.prototype.findOne,
      );

      expect(findAllPermissions).toEqual([
        { action: 'READ', resource: 'INVENTORY_TRANSACTION' },
      ]);
      expect(findOnePermissions).toEqual([
        { action: 'READ', resource: 'INVENTORY_TRANSACTION' },
      ]);
    });

    it('should require CREATE, UPDATE, DELETE permissions for write endpoints', () => {
      const createPermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryTransactionsController.prototype.create,
      );

      expect(createPermissions).toEqual([
        { action: 'CREATE', resource: 'INVENTORY_TRANSACTION' },
      ]);
    });
  });
});
