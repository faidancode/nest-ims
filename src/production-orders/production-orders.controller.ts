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
  CreateProductionOrderSchema,
  ListProductionOrdersQuerySchema,
  UpdateProductionOrderSchema,
} from './production-orders.schema';
import type {
  CreateProductionOrderInput,
  ListProductionOrdersQuery,
  UpdateProductionOrderInput,
} from './production-orders.schema';
import { ProductionOrdersService } from './production-orders.service';

@Controller('v1/production-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductionOrdersController {
  constructor(private readonly productionOrdersService: ProductionOrdersService) {}

  @SkipRateLimit()
  @Get()
  @RequirePermissions({ action: 'READ', resource: 'PRODUCTION_ORDER' })
  async findAll(
    @Query(new ZodValidationPipe(ListProductionOrdersQuerySchema))
    query: ListProductionOrdersQuery,
  ) {
    const result = await this.productionOrdersService.findAll(query);
    return result;
  }

  @Get(':id')
  @RequirePermissions({ action: 'READ', resource: 'PRODUCTION_ORDER' })
  async findOne(@Param('id') id: string) {
    const result = await this.productionOrdersService.findOne(id);
    return ok(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ action: 'CREATE', resource: 'PRODUCTION_ORDER' })
  async create(
    @Body(new ZodValidationPipe(CreateProductionOrderSchema))
    body: CreateProductionOrderInput,
  ) {
    const result = await this.productionOrdersService.create(body);
    return ok(result);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'UPDATE', resource: 'PRODUCTION_ORDER' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProductionOrderSchema))
    body: UpdateProductionOrderInput,
  ) {
    const result = await this.productionOrdersService.update(id, body);
    return ok(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ action: 'DELETE', resource: 'PRODUCTION_ORDER' })
  async remove(@Param('id') id: string) {
    await this.productionOrdersService.remove(id);
    return okNoContent();
  }
}

