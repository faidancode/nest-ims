import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { REQUIRED_PERMISSIONS_KEY } from '../common/constants/rbac-constants';
import { ok, okNoContent } from '../common/http/response';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { CreateCustomerSchema } from './customers.schema';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

describe('CustomersControllerTest', () => {
  let controller: CustomersController;
  let service: jest.Mocked<CustomersService>;

  beforeEach(async () => {
    const serviceMock: Partial<Record<keyof CustomersService, any>> = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CustomersController>(CustomersController);
    service = module.get(CustomersService) as jest.Mocked<CustomersService>;
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('CustomersControllerTest_FindAll', () => {
    it('should return paginated customers', async () => {
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
        search: 'customer',
      } as any);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'customer' }),
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

  describe('CustomersControllerTest_FindOne', () => {
    it('should return customer by id', async () => {
      service.findOne.mockResolvedValue({ id: 'cus-1' } as any);

      const result = await controller.findOne('cus-1');

      expect(service.findOne).toHaveBeenCalledWith('cus-1');
      expect(result).toEqual(ok({ id: 'cus-1' }));
    });

    describe('Negative Scenarios', () => {
      it('should throw when customer is not found', async () => {
        service.findOne.mockRejectedValue(
          new NotFoundException('Customer not found'),
        );

        await expect(controller.findOne('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('CustomersControllerTest_Create', () => {
    it('should create customer', async () => {
      const payload = { id: 'cus-1' };
      service.create.mockResolvedValue(payload as any);

      const result = await controller.create({
        name: 'PT Customer A',
        contactName: 'Dina',
        email: 'customer@example.com',
        phone: '08123456789',
        address: 'Bandung',
        active: true,
      });

      expect(service.create).toHaveBeenCalledWith({
        name: 'PT Customer A',
        contactName: 'Dina',
        email: 'customer@example.com',
        phone: '08123456789',
        address: 'Bandung',
        active: true,
      });
      expect(result).toEqual(ok(payload));
    });

    describe('Negative Scenarios', () => {
      it('should reject invalid create payload via schema', () => {
        const result = CreateCustomerSchema.safeParse({
          name: '',
          email: 'not-email',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('CustomersControllerTest_Update', () => {
    it('should update customer', async () => {
      const payload = { id: 'cus-1', name: 'PT Customer B' };
      service.update.mockResolvedValue(payload as any);

      const result = await controller.update('cus-1', {
        name: 'PT Customer B',
        active: false,
      });

      expect(service.update).toHaveBeenCalledWith('cus-1', {
        name: 'PT Customer B',
        active: false,
      });
      expect(result).toEqual(ok(payload));
    });

    describe('Negative Scenarios', () => {
      it('should reject invalid update payload via schema', () => {
        const result = CreateCustomerSchema.partial().safeParse({
          email: 'bad-email',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('CustomersControllerTest_Delete', () => {
    it('should remove customer', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('cus-1');

      expect(service.remove).toHaveBeenCalledWith('cus-1');
      expect(result).toEqual(okNoContent());
    });

    describe('Negative Scenarios', () => {
      it('should throw when service remove fails', async () => {
        service.remove.mockRejectedValue(
          new NotFoundException('Customer not found'),
        );

        await expect(controller.remove('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('CustomersControllerTest_RBACMetadata', () => {
    it('should require READ permission for findAll and findOne', () => {
      const findAllPermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        CustomersController.prototype.findAll,
      );
      const findOnePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        CustomersController.prototype.findOne,
      );

      expect(findAllPermissions).toEqual([
        { action: 'READ', resource: 'CUSTOMER' },
      ]);
      expect(findOnePermissions).toEqual([
        { action: 'READ', resource: 'CUSTOMER' },
      ]);
    });

    it('should require CREATE, UPDATE, DELETE permissions for write endpoints', () => {
      const createPermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        CustomersController.prototype.create,
      );
      const updatePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        CustomersController.prototype.update,
      );
      const removePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        CustomersController.prototype.remove,
      );

      expect(createPermissions).toEqual([
        { action: 'CREATE', resource: 'CUSTOMER' },
      ]);
      expect(updatePermissions).toEqual([
        { action: 'UPDATE', resource: 'CUSTOMER' },
      ]);
      expect(removePermissions).toEqual([
        { action: 'DELETE', resource: 'CUSTOMER' },
      ]);
    });
  });
});
