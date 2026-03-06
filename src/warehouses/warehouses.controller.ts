import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RequirePermissions } from '../common/rbac/permissions.decorator';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { SkipRateLimit } from '../common/rate-limit/rate-limit-decorator';
import type {
  CreateWarehouseInput,
  ListWarehousesQuery,
  UpdateWarehouseInput,
} from './warehouses.schema';
import {
  CreateWarehouseSchema,
  ListWarehousesQuerySchema,
  UpdateWarehouseSchema,
} from './warehouses.schema';
import { WarehouseService } from './warehouses.service';
import { ZodValidationPipe } from '../common/http/zod.validation.pipe';
import { ok, okNoContent } from '../common/http/response';

@Controller('v1/warehouses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @SkipRateLimit()
  @Get()
  @RequirePermissions({ action: 'READ', resource: 'WAREHOUSE' })
  async findAll(
    @Query(new ZodValidationPipe(ListWarehousesQuerySchema))
    query: ListWarehousesQuery,
  ) {
    const result = await this.warehouseService.findAll(query);
    return result;
  }

  @Get(':id')
  @RequirePermissions({ action: 'READ', resource: 'WAREHOUSE' })
  async findOne(@Param('id') id: string) {
    const result = await this.warehouseService.findOne(id);
    return ok(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ action: 'CREATE', resource: 'WAREHOUSE' })
  async create(
    @Body(new ZodValidationPipe(CreateWarehouseSchema))
    body: CreateWarehouseInput,
  ) {
    const result = await this.warehouseService.create(body);
    return ok(result);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'UPDATE', resource: 'WAREHOUSE' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateWarehouseSchema))
    body: UpdateWarehouseInput,
  ) {
    const result = await this.warehouseService.update(id, body);
    return ok(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ action: 'DELETE', resource: 'WAREHOUSE' })
  async remove(@Param('id') id: string) {
    await this.warehouseService.remove(id);
    return okNoContent();
  }
}
