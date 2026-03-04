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
import {
  CreateWarehouseSchema,
  ListWarehousesQuerySchema,
  UpdateWarehouseSchema,
} from './warehouse.schema';
import { WarehouseService } from './warehouse.service';

@Controller('v1/warehouses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @SkipRateLimit()
  @Get()
  @RequirePermissions({ action: 'READ', resource: 'WAREHOUSE' })
  async findAll(@Query() query: unknown) {
    const parsed = ListWarehousesQuerySchema.parse(query);
    return this.warehouseService.findAll(parsed);
  }

  @Get(':id')
  @RequirePermissions({ action: 'READ', resource: 'WAREHOUSE' })
  async findOne(@Param('id') id: string) {
    return this.warehouseService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ action: 'CREATE', resource: 'WAREHOUSE' })
  async create(@Body() body: unknown) {
    const parsed = CreateWarehouseSchema.parse(body);
    return this.warehouseService.create(parsed);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'UPDATE', resource: 'WAREHOUSE' })
  async update(@Param('id') id: string, @Body() body: unknown) {
    const parsed = UpdateWarehouseSchema.parse(body);
    return this.warehouseService.update(id, parsed);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ action: 'DELETE', resource: 'WAREHOUSE' })
  async remove(@Param('id') id: string) {
    await this.warehouseService.remove(id);

    return {
      ok: true,
      data: null,
      meta: null,
      error: null,
    };
  }
}
