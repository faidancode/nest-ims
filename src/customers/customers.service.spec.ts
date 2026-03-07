import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Customer } from './customer.entity';
import { CustomersService } from './customers.service';

describe('CustomersServiceTest', () => {
  let service: CustomersService;
  let auditLogsService: jest.Mocked<Pick<AuditLogsService, 'create'>>;
  let customerRepository: jest.Mocked<
    Pick<Repository<Customer>, 'findAndCount' | 'findOne' | 'save' | 'create'>
  >;

  beforeEach(async () => {
    auditLogsService = {
      create: jest.fn(),
    };

    customerRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: customerRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('CustomersServiceTest_FindAll', () => {
    it('should return paginated customers', async () => {
      const rows = [{ id: 'cus-1', name: 'PT Customer A' }] as Customer[];
      customerRepository.findAndCount.mockResolvedValue([rows, 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: undefined,
        sort: 'name:asc',
      });

      expect(customerRepository.findAndCount).toHaveBeenCalledWith(
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

    it('should apply search term when listing customers', async () => {
      customerRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: 'customer',
        sort: 'createdAt:desc',
      });

      expect(customerRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { deletedAt: IsNull(), name: Like('%customer%') },
            { deletedAt: IsNull(), contactName: Like('%customer%') },
            { deletedAt: IsNull(), email: Like('%customer%') },
            { deletedAt: IsNull(), phone: Like('%customer%') },
          ],
        }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw error when repository fails', async () => {
        customerRepository.findAndCount.mockRejectedValue(new Error('DB failure'));

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
        customerRepository.findAndCount.mockResolvedValue([[], 0]);

        await service.findAll({
          page: 1,
          limit: 10,
          q: undefined,
          search: '   ',
          sort: 'createdAt:desc',
        });

        expect(customerRepository.findAndCount).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { deletedAt: IsNull() },
          }),
        );
      });
    });
  });

  describe('CustomersServiceTest_FindOne', () => {
    it('should return customer by id', async () => {
      customerRepository.findOne.mockResolvedValue({
        id: 'cus-1',
      } as Customer);

      const result = await service.findOne('cus-1');

      expect(customerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'cus-1', deletedAt: IsNull() },
      });
      expect(result).toEqual({ id: 'cus-1' });
    });

    describe('Negative Scenarios', () => {
      it('should throw when customer not found', async () => {
        customerRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('CustomersServiceTest_Create', () => {
    it('should create customer when name does not exist', async () => {
      customerRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'cus-1' } as Customer);
      customerRepository.create.mockReturnValue({ id: 'cus-1' } as Customer);
      customerRepository.save.mockResolvedValue({ id: 'cus-1' } as Customer);

      const result = await service.create({
        name: 'PT Customer A',
        contactName: 'Dina',
        email: 'customer@example.com',
        phone: '08123456789',
        address: 'Bandung',
        active: true,
      });

      expect(customerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PT Customer A',
          contactName: 'Dina',
          email: 'customer@example.com',
          phone: '08123456789',
          address: 'Bandung',
          isActive: true,
        }),
      );
      expect(customerRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 'cus-1' });
    });

    describe('Negative Scenarios', () => {
      it('should throw when creating with duplicate active name', async () => {
        customerRepository.findOne.mockResolvedValue({
          id: 'cus-1',
          name: 'PT Customer A',
          deletedAt: null,
        } as Customer);

        await expect(
          service.create({
            name: 'PT Customer A',
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

  describe('CustomersServiceTest_Update', () => {
    it('should update customer', async () => {
      const existing = {
        id: 'cus-1',
        name: 'PT Customer A',
        contactName: 'Dina',
        email: 'customer@example.com',
        phone: '08123456789',
        address: 'Bandung',
        isActive: true,
        deletedAt: null,
      } as Customer;

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      customerRepository.findOne.mockResolvedValue(null);
      customerRepository.save.mockResolvedValue(existing);

      await service.update('cus-1', {
        name: 'PT Customer B',
        contactName: 'Rina',
        active: false,
      });

      expect(customerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PT Customer B',
          contactName: 'Rina',
          isActive: false,
        }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw when updating name to existing active customer name', async () => {
        const existing = {
          id: 'cus-1',
          name: 'PT Customer A',
          deletedAt: null,
        } as Customer;

        jest.spyOn(service, 'findOne').mockResolvedValue(existing);
        customerRepository.findOne.mockResolvedValue({
          id: 'cus-2',
          name: 'PT Customer B',
          deletedAt: null,
        } as Customer);

        await expect(service.update('cus-1', { name: 'PT Customer B' })).rejects.toThrow(
          ConflictException,
        );
      });
    });
  });

  describe('CustomersServiceTest_Remove', () => {
    it('should soft delete customer', async () => {
      const existing = {
        id: 'cus-1',
        name: 'PT Customer A',
        deletedAt: null,
      } as Customer;

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      customerRepository.save.mockResolvedValue(existing);

      await service.remove('cus-1');

      expect(customerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw when customer to remove is not found', async () => {
        jest
          .spyOn(service, 'findOne')
          .mockRejectedValue(new NotFoundException('Customer not found'));

        await expect(service.remove('missing')).rejects.toThrow(
          NotFoundException,
        );
        expect(customerRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});
