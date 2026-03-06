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
import { ok, okNoContent } from '../common/http/response';
import { ZodValidationPipe } from '../common/http/zod.validation.pipe';
import { RequirePermissions } from '../common/rbac/permissions.decorator';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { SkipRateLimit } from '../common/rate-limit/rate-limit-decorator';
import {
  CreateInventorySchema,
  ListInventoriesQuerySchema,
  UpdateInventorySchema,
} from './inventories.schema';
import type {
  CreateInventoryInput,
  ListInventoriesQuery,
  UpdateInventoryInput,
} from './inventories.schema';
import { InventoriesService } from './inventories.service';

@Controller('v1/inventories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoriesController {
  constructor(private readonly inventoriesService: InventoriesService) {}

  @SkipRateLimit()
  @Get()
  @RequirePermissions({ action: 'READ', resource: 'INVENTORY' })
  async findAll(
    @Query(new ZodValidationPipe(ListInventoriesQuerySchema))
    query: ListInventoriesQuery,
  ) {
    const result = await this.inventoriesService.findAll(query);
    return result;
  }

  @Get(':id')
  @RequirePermissions({ action: 'READ', resource: 'INVENTORY' })
  async findOne(@Param('id') id: string) {
    const result = await this.inventoriesService.findOne(id);
    return ok(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ action: 'CREATE', resource: 'INVENTORY' })
  async create(
    @Body(new ZodValidationPipe(CreateInventorySchema))
    body: CreateInventoryInput,
  ) {
    const result = await this.inventoriesService.create(body);
    return ok(result);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'UPDATE', resource: 'INVENTORY' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateInventorySchema))
    body: UpdateInventoryInput,
  ) {
    const result = await this.inventoriesService.update(id, body);
    return ok(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ action: 'DELETE', resource: 'INVENTORY' })
  async remove(@Param('id') id: string) {
    await this.inventoriesService.remove(id);
    return okNoContent();
  }
}
