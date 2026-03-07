import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { REQUIRED_PERMISSIONS_KEY } from '../common/constants/rbac-constants';
import { ok, okNoContent } from '../common/http/response';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { ProductionOrdersController } from './production-orders.controller';
import { ProductionOrdersService } from './production-orders.service';

describe('ProductionOrdersControllerTest', () => {
  let controller: ProductionOrdersController;
  let service: jest.Mocked<ProductionOrdersService>;

  beforeEach(async () => {
    const serviceMock: Partial<Record<keyof ProductionOrdersService, unknown>> = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionOrdersController],
      providers: [{ provide: ProductionOrdersService, useValue: serviceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductionOrdersController>(ProductionOrdersController);
    service = module.get(ProductionOrdersService) as jest.Mocked<ProductionOrdersService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list production orders', async () => {
    service.findAll.mockResolvedValue({ data: [], meta: {} } as never);
    const result = await controller.findAll({
      page: 1,
      limit: 10,
      sort: 'createdAt:desc',
    } as never);
    expect(result).toEqual({ data: [], meta: {} });
  });

  it('should get production order by id', async () => {
    service.findOne.mockResolvedValue({ id: 'prd-1' } as never);
    const result = await controller.findOne('prd-1');
    expect(result).toEqual(ok({ id: 'prd-1' }));
  });

  it('should create production order', async () => {
    service.create.mockResolvedValue({ id: 'prd-1' } as never);
    const result = await controller.create({
      poNumber: 'PROD-001',
      finishedPartId: '11111111-1111-4111-8111-111111111111',
      warehouseId: '22222222-2222-4222-8222-222222222222',
      quantity: 1,
      status: 'DRAFT',
    });
    expect(result).toEqual(ok({ id: 'prd-1' }));
  });

  it('should update production order', async () => {
    service.update.mockResolvedValue({ id: 'prd-1' } as never);
    const result = await controller.update('prd-1', { status: 'COMPLETED' });
    expect(result).toEqual(ok({ id: 'prd-1' }));
  });

  it('should remove production order', async () => {
    service.remove.mockResolvedValue(undefined);
    const result = await controller.remove('prd-1');
    expect(result).toEqual(okNoContent());
  });

  it('should throw when not found', async () => {
    service.findOne.mockRejectedValue(new NotFoundException('not found'));
    await expect(controller.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('should have RBAC metadata', () => {
    const readPerm = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      ProductionOrdersController.prototype.findAll,
    );
    expect(readPerm).toEqual([{ action: 'READ', resource: 'PRODUCTION_ORDER' }]);
  });
});

