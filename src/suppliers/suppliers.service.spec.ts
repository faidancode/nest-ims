import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { Supplier } from './supplier.entity';
import { SuppliersService } from './suppliers.service';

describe('SuppliersServiceTest', () => {
  let service: SuppliersService;
  let supplierRepository: jest.Mocked<
    Pick<Repository<Supplier>, 'findAndCount' | 'findOne' | 'save' | 'create'>
  >;

  beforeEach(async () => {
    supplierRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: supplierRepository,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('SuppliersServiceTest_FindAll', () => {
    it('should return paginated suppliers', async () => {
      const rows = [{ id: 'sup-1', name: 'PT Supplier A' }] as Supplier[];
      supplierRepository.findAndCount.mockResolvedValue([rows, 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: undefined,
        sort: 'name:asc',
      });

      expect(supplierRepository.findAndCount).toHaveBeenCalledWith(
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

    it('should apply search term when listing suppliers', async () => {
      supplierRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: 'supplier',
        sort: 'createdAt:desc',
      });

      expect(supplierRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { deletedAt: IsNull(), name: Like('%supplier%') },
            { deletedAt: IsNull(), contactName: Like('%supplier%') },
            { deletedAt: IsNull(), email: Like('%supplier%') },
            { deletedAt: IsNull(), phone: Like('%supplier%') },
          ],
        }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw error when repository fails', async () => {
        supplierRepository.findAndCount.mockRejectedValue(
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
        supplierRepository.findAndCount.mockResolvedValue([[], 0]);

        await service.findAll({
          page: 1,
          limit: 10,
          q: undefined,
          search: '   ',
          sort: 'createdAt:desc',
        });

        expect(supplierRepository.findAndCount).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { deletedAt: IsNull() },
          }),
        );
      });
    });
  });

  describe('SuppliersServiceTest_FindOne', () => {
    it('should return supplier by id', async () => {
      supplierRepository.findOne.mockResolvedValue({
        id: 'sup-1',
      } as Supplier);

      const result = await service.findOne('sup-1');

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'sup-1', deletedAt: IsNull() },
      });
      expect(result).toEqual({ id: 'sup-1' });
    });

    describe('Negative Scenarios', () => {
      it('should throw when supplier not found', async () => {
        supplierRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('SuppliersServiceTest_Create', () => {
    it('should create supplier when name does not exist', async () => {
      supplierRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'sup-1' } as Supplier);
      supplierRepository.create.mockReturnValue({ id: 'sup-1' } as Supplier);
      supplierRepository.save.mockResolvedValue({ id: 'sup-1' } as Supplier);

      const result = await service.create({
        name: 'PT Supplier A',
        contactName: 'Budi',
        email: 'supplier@example.com',
        phone: '08123456789',
        address: 'Jakarta',
        active: true,
      });

      expect(supplierRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PT Supplier A',
          contactName: 'Budi',
          email: 'supplier@example.com',
          phone: '08123456789',
          address: 'Jakarta',
          isActive: true,
        }),
      );
      expect(supplierRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 'sup-1' });
    });

    describe('Negative Scenarios', () => {
      it('should throw when creating with duplicate active name', async () => {
        supplierRepository.findOne.mockResolvedValue({
          id: 'sup-1',
          name: 'PT Supplier A',
          deletedAt: null,
        } as Supplier);

        await expect(
          service.create({
            name: 'PT Supplier A',
            contactName: undefined,
            email: undefined,
            phone: undefined,
            address: undefined,
            active: true,
          }),
        ).rejects.toThrow(ConflictException);
      });
    });
  });

  describe('SuppliersServiceTest_Update', () => {
    it('should update supplier', async () => {
      const existing = {
        id: 'sup-1',
        name: 'PT Supplier A',
        contactName: 'Budi',
        email: 'supplier@example.com',
        phone: '08123456789',
        address: 'Jakarta',
        isActive: true,
        deletedAt: null,
      } as Supplier;

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      supplierRepository.findOne.mockResolvedValue(null);
      supplierRepository.save.mockResolvedValue(existing);

      await service.update('sup-1', {
        name: 'PT Supplier B',
        contactName: 'Agus',
        active: false,
      });

      expect(supplierRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PT Supplier B',
          contactName: 'Agus',
          isActive: false,
        }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw when updating name to existing active supplier name', async () => {
        const existing = {
          id: 'sup-1',
          name: 'PT Supplier A',
          deletedAt: null,
        } as Supplier;

        jest.spyOn(service, 'findOne').mockResolvedValue(existing);
        supplierRepository.findOne.mockResolvedValue({
          id: 'sup-2',
          name: 'PT Supplier B',
          deletedAt: null,
        } as Supplier);

        await expect(service.update('sup-1', { name: 'PT Supplier B' })).rejects.toThrow(
          ConflictException,
        );
      });
    });
  });

  describe('SuppliersServiceTest_Remove', () => {
    it('should soft delete supplier', async () => {
      const existing = {
        id: 'sup-1',
        name: 'PT Supplier A',
        deletedAt: null,
      } as Supplier;

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      supplierRepository.save.mockResolvedValue(existing);

      await service.remove('sup-1');

      expect(supplierRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw when supplier to remove is not found', async () => {
        jest
          .spyOn(service, 'findOne')
          .mockRejectedValue(new NotFoundException('Supplier not found'));

        await expect(service.remove('missing')).rejects.toThrow(
          NotFoundException,
        );
        expect(supplierRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});
