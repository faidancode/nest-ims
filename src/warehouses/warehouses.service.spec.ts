import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { WarehouseService } from './warehouses.service';

describe('WarehouseServiceTest', () => {
  let service: WarehouseService;
  let warehouseRepository: jest.Mocked<
    Pick<Repository<Warehouse>, 'findAndCount' | 'findOne' | 'save' | 'create'>
  >;

  beforeEach(async () => {
    warehouseRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseService,
        {
          provide: getRepositoryToken(Warehouse),
          useValue: warehouseRepository,
        },
      ],
    }).compile();

    service = module.get<WarehouseService>(WarehouseService);
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('WarehouseServiceTest_FindAll', () => {
    it('should return paginated warehouses', async () => {
      const rows = [{ id: 'wh-1', name: 'Main Warehouse' }] as Warehouse[];
      warehouseRepository.findAndCount.mockResolvedValue([rows, 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: undefined,
        sort: 'name:asc',
      });

      expect(warehouseRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: IsNull() },
          order: { name: 'ASC' },
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

    it('should apply search term when listing warehouses', async () => {
      warehouseRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: 'jakarta',
        sort: 'createdAt:desc',
      });

      expect(warehouseRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { deletedAt: IsNull(), name: Like('%jakarta%') },
            { deletedAt: IsNull(), location: Like('%jakarta%') },
          ],
        }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw error when repository fails', async () => {
        warehouseRepository.findAndCount.mockRejectedValue(
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

      it('should handle invalid search terms gracefully', async () => {
        warehouseRepository.findAndCount.mockResolvedValue([[], 0]);

        await service.findAll({
          page: 1,
          limit: 10,
          q: undefined,
          search: '   ',
          sort: 'createdAt:desc',
        });

        expect(warehouseRepository.findAndCount).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { deletedAt: IsNull() },
          }),
        );
      });
    });
  });

  describe('WarehouseServiceTest_FindOne', () => {
    it('should return warehouse by id', async () => {
      warehouseRepository.findOne.mockResolvedValue({
        id: 'wh-1',
      } as Warehouse);

      const result = await service.findOne('wh-1');

      expect(warehouseRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'wh-1', deletedAt: IsNull() },
      });
      expect(result).toEqual({ id: 'wh-1' });
    });

    describe('Negative Scenarios', () => {
      it('should throw when warehouse not found', async () => {
        warehouseRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('WarehouseServiceTest_Create', () => {
    it('should create warehouse when name does not exist', async () => {
      warehouseRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'wh-1' } as Warehouse);
      warehouseRepository.create.mockReturnValue({ id: 'wh-1' } as Warehouse);
      warehouseRepository.save.mockResolvedValue({ id: 'wh-1' } as Warehouse);

      const result = await service.create({
        name: 'Main Warehouse',
        location: 'Jakarta',
        active: true,
      });

      expect(warehouseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Main Warehouse',
          location: 'Jakarta',
          isActive: true,
        }),
      );
      expect(warehouseRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 'wh-1' });
    });

    describe('Negative Scenarios', () => {
      it('should throw when creating with duplicate active name', async () => {
        warehouseRepository.findOne.mockResolvedValue({
          id: 'wh-1',
          name: 'Main Warehouse',
          deletedAt: null,
        } as Warehouse);

        await expect(
          service.create({
            name: 'Main Warehouse',
            location: undefined,
            active: true,
          }),
        ).rejects.toThrow(ConflictException);
      });
    });
  });

  describe('WarehouseServiceTest_Update', () => {
    it('should update warehouse', async () => {
      const existing = {
        id: 'wh-1',
        name: 'Main Warehouse',
        location: 'Jakarta',
        isActive: true,
        deletedAt: null,
      } as Warehouse;

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      warehouseRepository.findOne.mockResolvedValue(null);
      warehouseRepository.save.mockResolvedValue(existing);

      await service.update('wh-1', {
        name: 'Updated Warehouse',
        location: 'Bandung',
        active: false,
      });

      expect(warehouseRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Warehouse',
          location: 'Bandung',
          isActive: false,
        }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw when updating name to existing active warehouse name', async () => {
        const existing = {
          id: 'wh-1',
          name: 'Main Warehouse',
          location: 'Jakarta',
          isActive: true,
          deletedAt: null,
        } as Warehouse;

        jest.spyOn(service, 'findOne').mockResolvedValue(existing);
        warehouseRepository.findOne.mockResolvedValue({
          id: 'wh-2',
          name: 'Secondary Warehouse',
          deletedAt: null,
        } as Warehouse);

        await expect(
          service.update('wh-1', { name: 'Secondary Warehouse' }),
        ).rejects.toThrow(ConflictException);
      });
    });
  });

  describe('WarehouseServiceTest_Remove', () => {
    it('should soft delete warehouse', async () => {
      const existing = {
        id: 'wh-1',
        name: 'Main Warehouse',
        deletedAt: null,
      } as Warehouse;

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      warehouseRepository.save.mockResolvedValue(existing);

      await service.remove('wh-1');

      expect(warehouseRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw when warehouse to remove is not found', async () => {
        jest
          .spyOn(service, 'findOne')
          .mockRejectedValue(new NotFoundException('Warehouse not found'));

        await expect(service.remove('missing')).rejects.toThrow(
          NotFoundException,
        );
        expect(warehouseRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});
