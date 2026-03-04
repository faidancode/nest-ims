import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { REQUIRED_PERMISSIONS_KEY } from '../common/constants/rbac-constants';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';

describe('WarehouseControllerTest', () => {
  let controller: WarehouseController;
  let service: jest.Mocked<WarehouseService>;

  beforeEach(async () => {
    const serviceMock: Partial<Record<keyof WarehouseService, any>> = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehouseController],
      providers: [
        {
          provide: WarehouseService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WarehouseController>(WarehouseController);
    service = module.get(WarehouseService) as jest.Mocked<WarehouseService>;
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('WarehouseControllerTest_FindAll', () => {
    it('should return paginated warehouses', async () => {
      const payload = {
        items: [],
        meta: { page: 2, limit: 5, total: 0, totalPages: 0 },
      };
      service.findAll.mockResolvedValue(payload as any);

      const result = await controller.findAll({
        page: '2',
        limit: '5',
        sort: 'createdAt:desc',
      });

      expect(service.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        q: undefined,
        search: undefined,
        sort: 'createdAt:desc',
      });
      expect(result).toBe(payload);
    });

    it('should pass search param to service', async () => {
      service.findAll.mockResolvedValue({ items: [], meta: {} } as any);

      await controller.findAll({
        page: '1',
        limit: '10',
        sort: 'name:asc',
        search: 'jakarta',
      });

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'jakarta' }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw error when service fails', async () => {
        service.findAll.mockRejectedValue(new Error('Service unavailable'));

        await expect(
          controller.findAll({
            page: '1',
            limit: '10',
            sort: 'createdAt:desc',
          }),
        ).rejects.toThrow('Service unavailable');
      });

      it('should reject invalid pagination query', async () => {
        await expect(
          controller.findAll({
            page: '0',
            limit: '10',
            sort: 'createdAt:desc',
          }),
        ).rejects.toThrow(ZodError);
        expect(service.findAll).not.toHaveBeenCalled();
      });
    });
  });

  describe('WarehouseControllerTest_FindOne', () => {
    it('should return warehouse by id', async () => {
      service.findOne.mockResolvedValue({ id: 'wh-1' } as any);

      const result = await controller.findOne('wh-1');

      expect(service.findOne).toHaveBeenCalledWith('wh-1');
      expect(result).toEqual({ id: 'wh-1' });
    });

    describe('Negative Scenarios', () => {
      it('should throw when warehouse is not found', async () => {
        service.findOne.mockRejectedValue(
          new NotFoundException('Warehouse not found'),
        );

        await expect(controller.findOne('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('WarehouseControllerTest_Create', () => {
    it('should create warehouse', async () => {
      const payload = { id: 'wh-1' };
      service.create.mockResolvedValue(payload as any);

      const result = await controller.create({
        name: 'Main Warehouse',
        location: 'Jakarta',
        active: true,
      });

      expect(service.create).toHaveBeenCalledWith({
        name: 'Main Warehouse',
        location: 'Jakarta',
        active: true,
      });
      expect(result).toEqual(payload);
    });

    describe('Negative Scenarios', () => {
      it('should reject invalid create payload', async () => {
        await expect(
          controller.create({
            name: '',
            location: 'Jakarta',
            active: true,
          }),
        ).rejects.toThrow(ZodError);
        expect(service.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('WarehouseControllerTest_Update', () => {
    it('should update warehouse', async () => {
      const payload = { id: 'wh-1', name: 'Updated Warehouse' };
      service.update.mockResolvedValue(payload as any);

      const result = await controller.update('wh-1', {
        name: 'Updated Warehouse',
        active: false,
      });

      expect(service.update).toHaveBeenCalledWith('wh-1', {
        name: 'Updated Warehouse',
        active: false,
      });
      expect(result).toEqual(payload);
    });

    describe('Negative Scenarios', () => {
      it('should reject invalid update payload', async () => {
        await expect(
          controller.update('wh-1', {
            name: '',
          }),
        ).rejects.toThrow(ZodError);
        expect(service.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('WarehouseControllerTest_Delete', () => {
    it('should remove warehouse', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('wh-1');

      expect(service.remove).toHaveBeenCalledWith('wh-1');
      expect(result).toEqual({
        ok: true,
        data: null,
        meta: null,
        error: null,
      });
    });

    describe('Negative Scenarios', () => {
      it('should throw when service remove fails', async () => {
        service.remove.mockRejectedValue(new NotFoundException('Warehouse not found'));

        await expect(controller.remove('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('WarehouseControllerTest_RBACMetadata', () => {
    it('should require READ permission for findAll and findOne', () => {
      const findAllPermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        WarehouseController.prototype.findAll,
      );
      const findOnePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        WarehouseController.prototype.findOne,
      );

      expect(findAllPermissions).toEqual([
        { action: 'READ', resource: 'WAREHOUSE' },
      ]);
      expect(findOnePermissions).toEqual([
        { action: 'READ', resource: 'WAREHOUSE' },
      ]);
    });

    it('should require CREATE, UPDATE, DELETE permissions for write endpoints', () => {
      const createPermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        WarehouseController.prototype.create,
      );
      const updatePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        WarehouseController.prototype.update,
      );
      const removePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        WarehouseController.prototype.remove,
      );

      expect(createPermissions).toEqual([
        { action: 'CREATE', resource: 'WAREHOUSE' },
      ]);
      expect(updatePermissions).toEqual([
        { action: 'UPDATE', resource: 'WAREHOUSE' },
      ]);
      expect(removePermissions).toEqual([
        { action: 'DELETE', resource: 'WAREHOUSE' },
      ]);
    });
  });
});
