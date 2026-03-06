import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { REQUIRED_PERMISSIONS_KEY } from '../common/constants/rbac-constants';
import { ok, okNoContent } from '../common/http/response';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { CreateInventorySchema } from './inventories.schema';
import { InventoriesController } from './inventories.controller';
import { InventoriesService } from './inventories.service';

describe('InventoriesControllerTest', () => {
  let controller: InventoriesController;
  let service: jest.Mocked<InventoriesService>;

  beforeEach(async () => {
    const serviceMock: Partial<Record<keyof InventoriesService, any>> = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoriesController],
      providers: [
        {
          provide: InventoriesService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InventoriesController>(InventoriesController);
    service = module.get(InventoriesService) as jest.Mocked<InventoriesService>;
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('InventoriesControllerTest_FindAll', () => {
    it('should return paginated inventories', async () => {
      const payload = {
        data: [],
        meta: { page: 2, limit: 5, total: 0, totalPages: 0 },
      };
      service.findAll.mockResolvedValue(payload as any);

      const result = await controller.findAll({
        page: 2,
        limit: 5,
        sort: 'createdAt:desc',
      } as any);

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
      service.findAll.mockResolvedValue({ data: [], meta: {} } as any);

      await controller.findAll({
        page: 1,
        limit: 10,
        sort: 'quantity:asc',
        search: 'part-1',
      } as any);

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
          } as any),
        ).rejects.toThrow('Service unavailable');
      });
    });
  });

  describe('InventoriesControllerTest_FindOne', () => {
    it('should return inventory by id', async () => {
      service.findOne.mockResolvedValue({ id: 'inv-1' } as any);

      const result = await controller.findOne('inv-1');

      expect(service.findOne).toHaveBeenCalledWith('inv-1');
      expect(result).toEqual(ok({ id: 'inv-1' }));
    });

    describe('Negative Scenarios', () => {
      it('should throw when inventory is not found', async () => {
        service.findOne.mockRejectedValue(
          new NotFoundException('Inventory not found'),
        );

        await expect(controller.findOne('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('InventoriesControllerTest_Create', () => {
    it('should create inventory', async () => {
      const payload = { id: 'inv-1' };
      service.create.mockResolvedValue(payload as any);

      const result = await controller.create({
        partId: '11111111-1111-4111-8111-111111111111',
        warehouseId: '22222222-2222-4222-8222-222222222222',
        quantity: 10,
      });

      expect(service.create).toHaveBeenCalledWith({
        partId: '11111111-1111-4111-8111-111111111111',
        warehouseId: '22222222-2222-4222-8222-222222222222',
        quantity: 10,
      });
      expect(result).toEqual(ok(payload));
    });

    describe('Negative Scenarios', () => {
      it('should reject invalid create payload via schema', () => {
        const result = CreateInventorySchema.safeParse({
          partId: 'invalid-id',
          warehouseId: '22222222-2222-4222-8222-222222222222',
          quantity: -1,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('InventoriesControllerTest_Update', () => {
    it('should update inventory', async () => {
      const payload = { id: 'inv-1', quantity: '20.0000' };
      service.update.mockResolvedValue(payload as any);

      const result = await controller.update('inv-1', {
        quantity: 20,
      });

      expect(service.update).toHaveBeenCalledWith('inv-1', {
        quantity: 20,
      });
      expect(result).toEqual(ok(payload));
    });

    describe('Negative Scenarios', () => {
      it('should reject invalid update payload via schema', () => {
        const result = CreateInventorySchema.partial().safeParse({
          quantity: -5,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('InventoriesControllerTest_Delete', () => {
    it('should remove inventory', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('inv-1');

      expect(service.remove).toHaveBeenCalledWith('inv-1');
      expect(result).toEqual(okNoContent());
    });

    describe('Negative Scenarios', () => {
      it('should throw when service remove fails', async () => {
        service.remove.mockRejectedValue(
          new NotFoundException('Inventory not found'),
        );

        await expect(controller.remove('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('InventoriesControllerTest_RBACMetadata', () => {
    it('should require READ permission for findAll and findOne', () => {
      const findAllPermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoriesController.prototype.findAll,
      );
      const findOnePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoriesController.prototype.findOne,
      );

      expect(findAllPermissions).toEqual([
        { action: 'READ', resource: 'INVENTORY' },
      ]);
      expect(findOnePermissions).toEqual([
        { action: 'READ', resource: 'INVENTORY' },
      ]);
    });

    it('should require CREATE, UPDATE, DELETE permissions for write endpoints', () => {
      const createPermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoriesController.prototype.create,
      );
      const updatePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoriesController.prototype.update,
      );
      const removePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoriesController.prototype.remove,
      );

      expect(createPermissions).toEqual([
        { action: 'CREATE', resource: 'INVENTORY' },
      ]);
      expect(updatePermissions).toEqual([
        { action: 'UPDATE', resource: 'INVENTORY' },
      ]);
      expect(removePermissions).toEqual([
        { action: 'DELETE', resource: 'INVENTORY' },
      ]);
    });
  });
});
