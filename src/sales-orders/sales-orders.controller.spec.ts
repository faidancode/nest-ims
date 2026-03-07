import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { REQUIRED_PERMISSIONS_KEY } from '../common/constants/rbac-constants';
import { ok, okNoContent } from '../common/http/response';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { CreateSalesOrderSchema } from './sales-orders.schema';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';

describe('SalesOrdersControllerTest', () => {
  let controller: SalesOrdersController;
  let service: jest.Mocked<SalesOrdersService>;

  beforeEach(async () => {
    const serviceMock: Partial<Record<keyof SalesOrdersService, unknown>> = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesOrdersController],
      providers: [
        {
          provide: SalesOrdersService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SalesOrdersController>(SalesOrdersController);
    service = module.get(SalesOrdersService) as jest.Mocked<SalesOrdersService>;
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('SalesOrdersControllerTest_FindAll', () => {
    it('should return paginated sales orders', async () => {
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
  });

  describe('SalesOrdersControllerTest_FindOne', () => {
    it('should return sales order by id', async () => {
      service.findOne.mockResolvedValue({ id: 'so-1' } as never);

      const result = await controller.findOne('so-1');

      expect(service.findOne).toHaveBeenCalledWith('so-1');
      expect(result).toEqual(ok({ id: 'so-1' }));
    });

    it('should throw when sales order is not found', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Sales order not found'),
      );

      await expect(controller.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('SalesOrdersControllerTest_Create', () => {
    it('should create sales order', async () => {
      const payload = { id: 'so-1' };
      service.create.mockResolvedValue(payload as never);

      const result = await controller.create({
        soNumber: 'SO-001',
        customerId: '11111111-1111-4111-8111-111111111111',
        status: 'DRAFT',
      });

      expect(service.create).toHaveBeenCalledWith({
        soNumber: 'SO-001',
        customerId: '11111111-1111-4111-8111-111111111111',
        status: 'DRAFT',
      });
      expect(result).toEqual(ok(payload));
    });

    it('should reject invalid create payload via schema', () => {
      const result = CreateSalesOrderSchema.safeParse({
        soNumber: '',
        customerId: 'invalid-uuid',
        status: 'INVALID',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SalesOrdersControllerTest_Update', () => {
    it('should update sales order', async () => {
      const payload = { id: 'so-1', status: 'CONFIRMED' };
      service.update.mockResolvedValue(payload as never);

      const result = await controller.update('so-1', {
        status: 'CONFIRMED',
      });

      expect(service.update).toHaveBeenCalledWith('so-1', {
        status: 'CONFIRMED',
      });
      expect(result).toEqual(ok(payload));
    });
  });

  describe('SalesOrdersControllerTest_Delete', () => {
    it('should remove sales order', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('so-1');

      expect(service.remove).toHaveBeenCalledWith('so-1');
      expect(result).toEqual(okNoContent());
    });
  });

  describe('SalesOrdersControllerTest_RBACMetadata', () => {
    it('should require READ permission for findAll and findOne', () => {
      const findAllPermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        SalesOrdersController.prototype.findAll,
      );
      const findOnePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        SalesOrdersController.prototype.findOne,
      );

      expect(findAllPermissions).toEqual([
        { action: 'READ', resource: 'SALES_ORDER' },
      ]);
      expect(findOnePermissions).toEqual([
        { action: 'READ', resource: 'SALES_ORDER' },
      ]);
    });
  });
});
