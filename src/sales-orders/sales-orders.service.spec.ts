import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { SalesOrder } from './sales-order.entity';
import { SalesOrdersService } from './sales-orders.service';

describe('SalesOrdersServiceTest', () => {
  let service: SalesOrdersService;
  let salesOrderRepository: jest.Mocked<
    Pick<Repository<SalesOrder>, 'findAndCount' | 'findOne' | 'save' | 'create'>
  >;

  beforeEach(async () => {
    salesOrderRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesOrdersService,
        {
          provide: getRepositoryToken(SalesOrder),
          useValue: salesOrderRepository,
        },
      ],
    }).compile();

    service = module.get<SalesOrdersService>(SalesOrdersService);
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('SalesOrdersServiceTest_FindAll', () => {
    it('should return paginated sales orders', async () => {
      const rows = [{ id: 'so-1', soNumber: 'SO-001' }] as SalesOrder[];
      salesOrderRepository.findAndCount.mockResolvedValue([rows, 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: undefined,
        sort: 'soNumber:asc',
      });

      expect(salesOrderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: IsNull() },
          order: { soNumber: 'ASC' },
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

    it('should apply search term when listing sales orders', async () => {
      salesOrderRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: 'SO-001',
        sort: 'createdAt:desc',
      });

      expect(salesOrderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { deletedAt: IsNull(), soNumber: Like('%SO-001%') },
            { deletedAt: IsNull(), customerId: Like('%SO-001%') },
          ],
        }),
      );
    });
  });

  describe('SalesOrdersServiceTest_FindOne', () => {
    it('should return sales order by id', async () => {
      salesOrderRepository.findOne.mockResolvedValue({
        id: 'so-1',
      } as SalesOrder);

      const result = await service.findOne('so-1');

      expect(salesOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'so-1', deletedAt: IsNull() },
      });
      expect(result).toEqual({ id: 'so-1' });
    });

    it('should throw when sales order not found', async () => {
      salesOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('SalesOrdersServiceTest_Create', () => {
    it('should create sales order when number does not exist', async () => {
      salesOrderRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'so-1' } as SalesOrder);
      salesOrderRepository.create.mockReturnValue({ id: 'so-1' } as SalesOrder);
      salesOrderRepository.save.mockResolvedValue({ id: 'so-1' } as SalesOrder);

      const result = await service.create({
        soNumber: 'SO-001',
        customerId: '11111111-1111-4111-8111-111111111111',
        status: 'DRAFT',
      });

      expect(salesOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          soNumber: 'SO-001',
          customerId: '11111111-1111-4111-8111-111111111111',
          status: 'DRAFT',
        }),
      );
      expect(result).toEqual({ id: 'so-1' });
    });

    it('should throw when creating with duplicate active SO number', async () => {
      salesOrderRepository.findOne.mockResolvedValue({
        id: 'so-1',
        soNumber: 'SO-001',
        deletedAt: null,
      } as SalesOrder);

      await expect(
        service.create({
          soNumber: 'SO-001',
          customerId: '11111111-1111-4111-8111-111111111111',
          status: 'DRAFT',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('SalesOrdersServiceTest_Update', () => {
    it('should update sales order', async () => {
      const existing = {
        id: 'so-1',
        soNumber: 'SO-001',
        customerId: '11111111-1111-4111-8111-111111111111',
        status: 'DRAFT',
        orderDate: new Date(),
        deletedAt: null,
      } as SalesOrder;

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      salesOrderRepository.findOne.mockResolvedValue(null);
      salesOrderRepository.save.mockResolvedValue(existing);

      await service.update('so-1', {
        soNumber: 'SO-002',
        status: 'CONFIRMED',
      });

      expect(salesOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          soNumber: 'SO-002',
          status: 'CONFIRMED',
        }),
      );
    });
  });

  describe('SalesOrdersServiceTest_Remove', () => {
    it('should soft delete sales order', async () => {
      const existing = {
        id: 'so-1',
        soNumber: 'SO-001',
        deletedAt: null,
      } as SalesOrder;

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      salesOrderRepository.save.mockResolvedValue(existing);

      await service.remove('so-1');

      expect(salesOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });
  });
});
