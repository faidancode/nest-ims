import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { REQUIRED_PERMISSIONS_KEY } from '../common/constants/rbac-constants';
import { ok } from '../common/http/response';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsControllerTest', () => {
  let controller: AuditLogsController;
  let service: jest.Mocked<AuditLogsService>;

  beforeEach(async () => {
    const serviceMock: Partial<Record<keyof AuditLogsService, unknown>> = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        {
          provide: AuditLogsService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
    service = module.get(AuditLogsService) as jest.Mocked<AuditLogsService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return paginated audit logs', async () => {
    const payload = {
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
    service.findAll.mockResolvedValue(payload as never);

    const result = await controller.findAll({
      page: 1,
      limit: 10,
      q: undefined,
      search: undefined,
      sort: 'createdAt:desc',
    } as never);

    expect(service.findAll).toHaveBeenCalled();
    expect(result).toEqual(payload);
  });

  it('should return audit log by id', async () => {
    service.findOne.mockResolvedValue({ id: 'log-1' } as never);

    const result = await controller.findOne('log-1');

    expect(service.findOne).toHaveBeenCalledWith('log-1');
    expect(result).toEqual(ok({ id: 'log-1' }));
  });

  it('should throw when audit log not found', async () => {
    service.findOne.mockRejectedValue(new NotFoundException('Audit log not found'));

    await expect(controller.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('should require READ permission for read endpoints', () => {
    const findAllPermissions = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      AuditLogsController.prototype.findAll,
    );
    const findOnePermissions = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      AuditLogsController.prototype.findOne,
    );

    expect(findAllPermissions).toEqual([
      { action: 'READ', resource: 'AUDIT_LOG' },
    ]);
    expect(findOnePermissions).toEqual([
      { action: 'READ', resource: 'AUDIT_LOG' },
    ]);
  });
});

