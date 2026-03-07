import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { REQUIRED_PERMISSIONS_KEY } from '../common/constants/rbac-constants';
import { ok, okNoContent } from '../common/http/response';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { BillOfMaterialsController } from './bill-of-materials.controller';
import { BillOfMaterialsService } from './bill-of-materials.service';

describe('BillOfMaterialsControllerTest', () => {
  let controller: BillOfMaterialsController;
  let service: jest.Mocked<BillOfMaterialsService>;

  beforeEach(async () => {
    const serviceMock: Partial<Record<keyof BillOfMaterialsService, unknown>> = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillOfMaterialsController],
      providers: [{ provide: BillOfMaterialsService, useValue: serviceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BillOfMaterialsController>(BillOfMaterialsController);
    service = module.get(BillOfMaterialsService) as jest.Mocked<BillOfMaterialsService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list bom entries', async () => {
    service.findAll.mockResolvedValue({ data: [], meta: {} } as never);
    const result = await controller.findAll({
      page: 1,
      limit: 10,
      sort: 'createdAt:desc',
    } as never);
    expect(result).toEqual({ data: [], meta: {} });
  });

  it('should get bom entry by id', async () => {
    service.findOne.mockResolvedValue({ id: 'bom-1' } as never);
    const result = await controller.findOne('bom-1');
    expect(result).toEqual(ok({ id: 'bom-1' }));
  });

  it('should create bom entry', async () => {
    service.create.mockResolvedValue({ id: 'bom-1' } as never);
    const result = await controller.create({
      finishedPartId: '11111111-1111-4111-8111-111111111111',
      rawPartId: '22222222-2222-4222-8222-222222222222',
      quantity: 1,
      unit: 'PCS',
    });
    expect(result).toEqual(ok({ id: 'bom-1' }));
  });

  it('should update bom entry', async () => {
    service.update.mockResolvedValue({ id: 'bom-1' } as never);
    const result = await controller.update('bom-1', { unit: 'KG' });
    expect(result).toEqual(ok({ id: 'bom-1' }));
  });

  it('should remove bom entry', async () => {
    service.remove.mockResolvedValue(undefined);
    const result = await controller.remove('bom-1');
    expect(result).toEqual(okNoContent());
  });

  it('should throw when not found', async () => {
    service.findOne.mockRejectedValue(new NotFoundException('not found'));
    await expect(controller.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('should have RBAC metadata', () => {
    const readPerm = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      BillOfMaterialsController.prototype.findAll,
    );
    expect(readPerm).toEqual([{ action: 'READ', resource: 'BILL_OF_MATERIAL' }]);
  });
});

