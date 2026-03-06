import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { REQUIRED_PERMISSIONS_KEY } from '../common/constants/rbac-constants';
import { ok, okNoContent } from '../common/http/response';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { CreateSupplierSchema } from './suppliers.schema';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

describe('SuppliersControllerTest', () => {
  let controller: SuppliersController;
  let service: jest.Mocked<SuppliersService>;

  beforeEach(async () => {
    const serviceMock: Partial<Record<keyof SuppliersService, any>> = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        {
          provide: SuppliersService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SuppliersController>(SuppliersController);
    service = module.get(SuppliersService) as jest.Mocked<SuppliersService>;
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('SuppliersControllerTest_FindAll', () => {
    it('should return paginated suppliers', async () => {
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
        sort: 'name:asc',
        search: 'supplier',
      } as any);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'supplier' }),
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

  describe('SuppliersControllerTest_FindOne', () => {
    it('should return supplier by id', async () => {
      service.findOne.mockResolvedValue({ id: 'sup-1' } as any);

      const result = await controller.findOne('sup-1');

      expect(service.findOne).toHaveBeenCalledWith('sup-1');
      expect(result).toEqual(ok({ id: 'sup-1' }));
    });

    describe('Negative Scenarios', () => {
      it('should throw when supplier is not found', async () => {
        service.findOne.mockRejectedValue(
          new NotFoundException('Supplier not found'),
        );

        await expect(controller.findOne('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('SuppliersControllerTest_Create', () => {
    it('should create supplier', async () => {
      const payload = { id: 'sup-1' };
      service.create.mockResolvedValue(payload as any);

      const result = await controller.create({
        name: 'PT Supplier A',
        contactName: 'Budi',
        email: 'supplier@example.com',
        phone: '08123456789',
        address: 'Jakarta',
        active: true,
      });

      expect(service.create).toHaveBeenCalledWith({
        name: 'PT Supplier A',
        contactName: 'Budi',
        email: 'supplier@example.com',
        phone: '08123456789',
        address: 'Jakarta',
        active: true,
      });
      expect(result).toEqual(ok(payload));
    });

    describe('Negative Scenarios', () => {
      it('should reject invalid create payload via schema', () => {
        const result = CreateSupplierSchema.safeParse({
          name: '',
          email: 'not-email',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('SuppliersControllerTest_Update', () => {
    it('should update supplier', async () => {
      const payload = { id: 'sup-1', name: 'PT Supplier B' };
      service.update.mockResolvedValue(payload as any);

      const result = await controller.update('sup-1', {
        name: 'PT Supplier B',
        active: false,
      });

      expect(service.update).toHaveBeenCalledWith('sup-1', {
        name: 'PT Supplier B',
        active: false,
      });
      expect(result).toEqual(ok(payload));
    });

    describe('Negative Scenarios', () => {
      it('should reject invalid update payload via schema', () => {
        const result = CreateSupplierSchema.partial().safeParse({
          email: 'bad-email',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('SuppliersControllerTest_Delete', () => {
    it('should remove supplier', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('sup-1');

      expect(service.remove).toHaveBeenCalledWith('sup-1');
      expect(result).toEqual(okNoContent());
    });

    describe('Negative Scenarios', () => {
      it('should throw when service remove fails', async () => {
        service.remove.mockRejectedValue(
          new NotFoundException('Supplier not found'),
        );

        await expect(controller.remove('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('SuppliersControllerTest_RBACMetadata', () => {
    it('should require READ permission for findAll and findOne', () => {
      const findAllPermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        SuppliersController.prototype.findAll,
      );
      const findOnePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        SuppliersController.prototype.findOne,
      );

      expect(findAllPermissions).toEqual([
        { action: 'READ', resource: 'SUPPLIER' },
      ]);
      expect(findOnePermissions).toEqual([
        { action: 'READ', resource: 'SUPPLIER' },
      ]);
    });

    it('should require CREATE, UPDATE, DELETE permissions for write endpoints', () => {
      const createPermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        SuppliersController.prototype.create,
      );
      const updatePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        SuppliersController.prototype.update,
      );
      const removePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        SuppliersController.prototype.remove,
      );

      expect(createPermissions).toEqual([
        { action: 'CREATE', resource: 'SUPPLIER' },
      ]);
      expect(updatePermissions).toEqual([
        { action: 'UPDATE', resource: 'SUPPLIER' },
      ]);
      expect(removePermissions).toEqual([
        { action: 'DELETE', resource: 'SUPPLIER' },
      ]);
    });
  });
});
