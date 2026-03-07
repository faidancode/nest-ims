import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { REQUIRED_PERMISSIONS_KEY } from '../common/constants/rbac-constants';
import { ok, okNoContent } from '../common/http/response';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { CreatePurchaseOrderSchema } from './purchase-orders.schema';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';

describe('PurchaseOrdersControllerTest', () => {
  let controller: PurchaseOrdersController;
  let service: jest.Mocked<PurchaseOrdersService>;

  beforeEach(async () => {
    const serviceMock: Partial<Record<keyof PurchaseOrdersService, unknown>> = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseOrdersController],
      providers: [
        {
          provide: PurchaseOrdersService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PurchaseOrdersController>(PurchaseOrdersController);
    service = module.get(
      PurchaseOrdersService,
    ) as jest.Mocked<PurchaseOrdersService>;
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('PurchaseOrdersControllerTest_FindAll', () => {
    it('should return paginated purchase orders', async () => {
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

  describe('PurchaseOrdersControllerTest_FindOne', () => {
    it('should return purchase order by id', async () => {
      service.findOne.mockResolvedValue({ id: 'po-1' } as never);

      const result = await controller.findOne('po-1');

      expect(service.findOne).toHaveBeenCalledWith('po-1');
      expect(result).toEqual(ok({ id: 'po-1' }));
    });

    describe('Negative Scenarios', () => {
      it('should throw when purchase order is not found', async () => {
        service.findOne.mockRejectedValue(
          new NotFoundException('Purchase order not found'),
        );

        await expect(controller.findOne('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('PurchaseOrdersControllerTest_Create', () => {
    it('should create purchase order', async () => {
      const payload = { id: 'po-1' };
      service.create.mockResolvedValue(payload as never);

      const result = await controller.create({
        poNumber: 'PO-001',
        supplierId: '11111111-1111-4111-8111-111111111111',
        status: 'DRAFT',
      });

      expect(service.create).toHaveBeenCalledWith({
        poNumber: 'PO-001',
        supplierId: '11111111-1111-4111-8111-111111111111',
        status: 'DRAFT',
      });
      expect(result).toEqual(ok(payload));
    });

    describe('Negative Scenarios', () => {
      it('should reject invalid create payload via schema', () => {
        const result = CreatePurchaseOrderSchema.safeParse({
          poNumber: '',
          supplierId: 'invalid-uuid',
          status: 'INVALID',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('PurchaseOrdersControllerTest_Update', () => {
    it('should update purchase order', async () => {
      const payload = { id: 'po-1', status: 'RECEIVED' };
      service.update.mockResolvedValue(payload as never);

      const result = await controller.update('po-1', {
        status: 'RECEIVED',
      });

      expect(service.update).toHaveBeenCalledWith('po-1', {
        status: 'RECEIVED',
      });
      expect(result).toEqual(ok(payload));
    });
  });

  describe('PurchaseOrdersControllerTest_Delete', () => {
    it('should remove purchase order', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('po-1');

      expect(service.remove).toHaveBeenCalledWith('po-1');
      expect(result).toEqual(okNoContent());
    });
  });

  describe('PurchaseOrdersControllerTest_RBACMetadata', () => {
    it('should require READ permission for findAll and findOne', () => {
      const findAllPermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        PurchaseOrdersController.prototype.findAll,
      );
      const findOnePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        PurchaseOrdersController.prototype.findOne,
      );

      expect(findAllPermissions).toEqual([
        { action: 'READ', resource: 'PURCHASE_ORDER' },
      ]);
      expect(findOnePermissions).toEqual([
        { action: 'READ', resource: 'PURCHASE_ORDER' },
      ]);
    });
  });
});
