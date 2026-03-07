import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Part } from './part.entity';
import { PartsService } from './parts.service';

describe('PartsServiceTest', () => {
  let service: PartsService;
  let auditLogsService: jest.Mocked<Pick<AuditLogsService, 'create'>>;
  let partRepository: jest.Mocked<
    Pick<Repository<Part>, 'findAndCount' | 'findOne' | 'save' | 'create'>
  >;

  beforeEach(async () => {
    auditLogsService = {
      create: jest.fn(),
    };

    partRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartsService,
        {
          provide: getRepositoryToken(Part),
          useValue: partRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<PartsService>(PartsService);
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('PartsServiceTest_FindAll', () => {
    it('should return paginated parts', async () => {
      const rows = [{ id: 'part-1', name: 'Steel Rod' }] as Part[];
      partRepository.findAndCount.mockResolvedValue([rows, 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: undefined,
        sort: 'name:asc',
      });

      expect(partRepository.findAndCount).toHaveBeenCalledWith(
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

    it('should apply search term when listing parts', async () => {
      partRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 10,
        q: undefined,
        search: 'steel',
        sort: 'createdAt:desc',
      });

      expect(partRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { deletedAt: IsNull(), partNumber: Like('%steel%') },
            { deletedAt: IsNull(), name: Like('%steel%') },
          ],
        }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw error when repository fails', async () => {
        partRepository.findAndCount.mockRejectedValue(new Error('DB failure'));

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
        partRepository.findAndCount.mockResolvedValue([[], 0]);

        await service.findAll({
          page: 1,
          limit: 10,
          q: undefined,
          search: '   ',
          sort: 'createdAt:desc',
        });

        expect(partRepository.findAndCount).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { deletedAt: IsNull() },
          }),
        );
      });
    });
  });

  describe('PartsServiceTest_FindOne', () => {
    it('should return part by id', async () => {
      partRepository.findOne.mockResolvedValue({
        id: 'part-1',
      } as Part);

      const result = await service.findOne('part-1');

      expect(partRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'part-1', deletedAt: IsNull() },
      });
      expect(result).toEqual({ id: 'part-1' });
    });

    describe('Negative Scenarios', () => {
      it('should throw when part not found', async () => {
        partRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('PartsServiceTest_Create', () => {
    it('should create part when part number does not exist', async () => {
      partRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'part-1' } as Part);
      partRepository.create.mockReturnValue({ id: 'part-1' } as Part);
      partRepository.save.mockResolvedValue({ id: 'part-1' } as Part);

      const result = await service.create({
        partNumber: 'RAW-001',
        name: 'Steel Rod',
        description: 'Raw steel rod',
        type: 'RAW',
        unit: 'PCS',
      });

      expect(partRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          partNumber: 'RAW-001',
          name: 'Steel Rod',
          description: 'Raw steel rod',
          type: 'RAW',
          unit: 'PCS',
        }),
      );
      expect(partRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 'part-1' });
    });

    describe('Negative Scenarios', () => {
      it('should throw when creating with duplicate active part number', async () => {
        partRepository.findOne.mockResolvedValue({
          id: 'part-1',
          partNumber: 'RAW-001',
          deletedAt: null,
        } as Part);

        await expect(
          service.create({
            partNumber: 'RAW-001',
            name: 'Steel Rod',
            description: undefined,
            type: 'RAW',
            unit: 'PCS',
          }),
        ).rejects.toThrow(ConflictException);
      });
    });
  });

  describe('PartsServiceTest_Update', () => {
    it('should update part', async () => {
      const existing = {
        id: 'part-1',
        partNumber: 'RAW-001',
        name: 'Steel Rod',
        description: 'Raw steel rod',
        type: 'RAW',
        unit: 'PCS',
        deletedAt: null,
      } as Part;

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      partRepository.findOne.mockResolvedValue(null);
      partRepository.save.mockResolvedValue(existing);

      await service.update('part-1', {
        partNumber: 'RAW-002',
        name: 'Steel Pipe',
        description: 'Updated raw steel',
        type: 'RAW',
        unit: 'M',
      });

      expect(partRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          partNumber: 'RAW-002',
          name: 'Steel Pipe',
          description: 'Updated raw steel',
          type: 'RAW',
          unit: 'M',
        }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw when updating part number to existing active part number', async () => {
        const existing = {
          id: 'part-1',
          partNumber: 'RAW-001',
          name: 'Steel Rod',
          description: 'Raw steel rod',
          type: 'RAW',
          unit: 'PCS',
          deletedAt: null,
        } as Part;

        jest.spyOn(service, 'findOne').mockResolvedValue(existing);
        partRepository.findOne.mockResolvedValue({
          id: 'part-2',
          partNumber: 'RAW-002',
          deletedAt: null,
        } as Part);

        await expect(
          service.update('part-1', { partNumber: 'RAW-002' }),
        ).rejects.toThrow(ConflictException);
      });
    });
  });

  describe('PartsServiceTest_Remove', () => {
    it('should soft delete part', async () => {
      const existing = {
        id: 'part-1',
        partNumber: 'RAW-001',
        deletedAt: null,
      } as Part;

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      partRepository.save.mockResolvedValue(existing);

      await service.remove('part-1');

      expect(partRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    describe('Negative Scenarios', () => {
      it('should throw when part to remove is not found', async () => {
        jest
          .spyOn(service, 'findOne')
          .mockRejectedValue(new NotFoundException('Part not found'));

        await expect(service.remove('missing')).rejects.toThrow(
          NotFoundException,
        );
        expect(partRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});
