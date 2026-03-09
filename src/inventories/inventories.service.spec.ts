import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Inventory } from './inventory.entity';
import { InventoriesService } from './inventories.service';

describe('InventoriesServiceTest', () => {
  let service: InventoriesService;
  let auditLogsService: jest.Mocked<Pick<AuditLogsService, 'create'>>;
  let inventoryRepository: jest.Mocked<
    Pick<Repository<Inventory>, 'findAndCount' | 'findOne' | 'save' | 'create'>
  >;

  beforeEach(async () => {
    auditLogsService = {
      create: jest.fn(),
    };

    inventoryRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoriesService,
        {
          provide: getRepositoryToken(Inventory),
          useValue: inventoryRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<InventoriesService>(InventoriesService);
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('InventoriesServiceTest_FindAll', () => {
    it('should return paginated inventories', async () => {
      const rows = [{ id: 'inv-1', quantity: '10.0000' }] as Inventory[];
      inventoryRepository.findAndCount.mockResolvedValue([rows, 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: undefined,
        sort: 'quantity:asc',
      });

      expect(inventoryRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: IsNull() },
          order: { quantity: 'ASC' },
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

    it('should apply search term when listing inventories', async () => {
      inventoryRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: 'part-1',
        sort: 'createdAt:desc',
      });

      expect(inventoryRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { deletedAt: IsNull(), partId: Like('%part-1%') },
            { deletedAt: IsNull(), warehouseId: Like('%part-1%') },
          ],
        }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw error when repository fails', async () => {
        inventoryRepository.findAndCount.mockRejectedValue(
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
        inventoryRepository.findAndCount.mockResolvedValue([[], 0]);

        await service.findAll({
          page: 1,
          limit: 10,
          q: undefined,
          search: '   ',
          sort: 'createdAt:desc',
        });

        expect(inventoryRepository.findAndCount).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { deletedAt: IsNull() },
          }),
        );
      });
    });
  });

  describe('InventoriesServiceTest_FindOne', () => {
    it('should return inventory by id', async () => {
      inventoryRepository.findOne.mockResolvedValue({
        id: 'inv-1',
      } as Inventory);

      const result = await service.findOne('inv-1');

      expect(inventoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'inv-1', deletedAt: IsNull() },
      });
      expect(result).toEqual({ id: 'inv-1' });
    });

    describe('Negative Scenarios', () => {
      it('should throw when inventory not found', async () => {
        inventoryRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('InventoriesServiceTest_Create', () => {
    it('should create inventory when part and warehouse combination does not exist', async () => {
      inventoryRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'inv-1' } as Inventory);
      inventoryRepository.create.mockReturnValue({ id: 'inv-1' } as Inventory);
      inventoryRepository.save.mockResolvedValue({ id: 'inv-1' } as Inventory);

      const result = await service.create({
        partId: '11111111-1111-4111-8111-111111111111',
        warehouseId: '22222222-2222-4222-8222-222222222222',
        quantity: 10,
      });

      expect(inventoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          partId: '11111111-1111-4111-8111-111111111111',
          warehouseId: '22222222-2222-4222-8222-222222222222',
          quantity: '10.0000',
        }),
      );
      expect(inventoryRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 'inv-1' });
    });

    describe('Negative Scenarios', () => {
      it('should throw when creating duplicate active inventory', async () => {
        inventoryRepository.findOne.mockResolvedValue({
          id: 'inv-1',
          partId: '11111111-1111-4111-8111-111111111111',
          warehouseId: '22222222-2222-4222-8222-222222222222',
          deletedAt: null,
        } as Inventory);

        await expect(
          service.create({
            partId: '11111111-1111-4111-8111-111111111111',
            warehouseId: '22222222-2222-4222-8222-222222222222',
            quantity: 5,
          }),
        ).rejects.toThrow(ConflictException);
      });
    });
  });

  describe('InventoriesServiceTest_Update', () => {
    it('should update inventory', async () => {
      const existing = {
        id: 'inv-1',
        partId: '11111111-1111-4111-8111-111111111111',
        warehouseId: '22222222-2222-4222-8222-222222222222',
        quantity: '10.0000',
        deletedAt: null,
      } as Inventory;

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      inventoryRepository.findOne.mockResolvedValue(null);
      inventoryRepository.save.mockResolvedValue(existing);

      await service.update('inv-1', {
        quantity: 20,
      });

      expect(inventoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: '20.0000',
        }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw when updating to existing active part and warehouse combination', async () => {
        const existing = {
          id: 'inv-1',
          partId: '11111111-1111-4111-8111-111111111111',
          warehouseId: '22222222-2222-4222-8222-222222222222',
          quantity: '10.0000',
          deletedAt: null,
        } as Inventory;

        jest.spyOn(service, 'findOne').mockResolvedValue(existing);
        inventoryRepository.findOne.mockResolvedValue({
          id: 'inv-2',
          partId: '33333333-3333-4333-8333-333333333333',
          warehouseId: '44444444-4444-4444-8444-444444444444',
          deletedAt: null,
        } as Inventory);

        await expect(
          service.update('inv-1', {
            partId: '33333333-3333-4333-8333-333333333333',
            warehouseId: '44444444-4444-4444-8444-444444444444',
          }),
        ).rejects.toThrow(ConflictException);
      });
    });
  });
});
