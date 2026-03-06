import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { REQUIRED_PERMISSIONS_KEY } from '../common/constants/rbac-constants';
import { ok, okNoContent } from '../common/http/response';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { CreatePartSchema } from './parts.schema';
import { PartsController } from './parts.controller';
import { PartsService } from './parts.service';

describe('PartsControllerTest', () => {
  let controller: PartsController;
  let service: jest.Mocked<PartsService>;

  beforeEach(async () => {
    const serviceMock: Partial<Record<keyof PartsService, any>> = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartsController],
      providers: [
        {
          provide: PartsService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PartsController>(PartsController);
    service = module.get(PartsService) as jest.Mocked<PartsService>;
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('PartsControllerTest_FindAll', () => {
    it('should return paginated parts', async () => {
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
        search: 'steel',
      } as any);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'steel' }),
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

  describe('PartsControllerTest_FindOne', () => {
    it('should return part by id', async () => {
      service.findOne.mockResolvedValue({ id: 'part-1' } as any);

      const result = await controller.findOne('part-1');

      expect(service.findOne).toHaveBeenCalledWith('part-1');
      expect(result).toEqual(ok({ id: 'part-1' }));
    });

    describe('Negative Scenarios', () => {
      it('should throw when part is not found', async () => {
        service.findOne.mockRejectedValue(new NotFoundException('Part not found'));

        await expect(controller.findOne('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('PartsControllerTest_Create', () => {
    it('should create part', async () => {
      const payload = { id: 'part-1' };
      service.create.mockResolvedValue(payload as any);

      const result = await controller.create({
        partNumber: 'RAW-001',
        name: 'Steel Rod',
        description: 'Raw steel rod',
        type: 'RAW',
        unit: 'PCS',
      });

      expect(service.create).toHaveBeenCalledWith({
        partNumber: 'RAW-001',
        name: 'Steel Rod',
        description: 'Raw steel rod',
        type: 'RAW',
        unit: 'PCS',
      });
      expect(result).toEqual(ok(payload));
    });

    describe('Negative Scenarios', () => {
      it('should reject invalid create payload via schema', () => {
        const result = CreatePartSchema.safeParse({
          partNumber: '',
          name: 'Steel Rod',
          type: 'RAW',
          unit: 'PCS',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('PartsControllerTest_Update', () => {
    it('should update part', async () => {
      const payload = { id: 'part-1', name: 'Steel Pipe' };
      service.update.mockResolvedValue(payload as any);

      const result = await controller.update('part-1', {
        name: 'Steel Pipe',
        unit: 'M',
      });

      expect(service.update).toHaveBeenCalledWith('part-1', {
        name: 'Steel Pipe',
        unit: 'M',
      });
      expect(result).toEqual(ok(payload));
    });

    describe('Negative Scenarios', () => {
      it('should reject invalid update payload via schema', () => {
        const result = CreatePartSchema.partial().safeParse({
          unit: '',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('PartsControllerTest_Delete', () => {
    it('should remove part', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('part-1');

      expect(service.remove).toHaveBeenCalledWith('part-1');
      expect(result).toEqual(okNoContent());
    });

    describe('Negative Scenarios', () => {
      it('should throw when service remove fails', async () => {
        service.remove.mockRejectedValue(new NotFoundException('Part not found'));

        await expect(controller.remove('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('PartsControllerTest_RBACMetadata', () => {
    it('should require READ permission for findAll and findOne', () => {
      const findAllPermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        PartsController.prototype.findAll,
      );
      const findOnePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        PartsController.prototype.findOne,
      );

      expect(findAllPermissions).toEqual([{ action: 'READ', resource: 'PART' }]);
      expect(findOnePermissions).toEqual([{ action: 'READ', resource: 'PART' }]);
    });

    it('should require CREATE, UPDATE, DELETE permissions for write endpoints', () => {
      const createPermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        PartsController.prototype.create,
      );
      const updatePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        PartsController.prototype.update,
      );
      const removePermissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        PartsController.prototype.remove,
      );

      expect(createPermissions).toEqual([
        { action: 'CREATE', resource: 'PART' },
      ]);
      expect(updatePermissions).toEqual([
        { action: 'UPDATE', resource: 'PART' },
      ]);
      expect(removePermissions).toEqual([
        { action: 'DELETE', resource: 'PART' },
      ]);
    });
  });
});
