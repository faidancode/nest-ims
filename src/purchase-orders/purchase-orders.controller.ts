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
  CreatePurchaseOrderSchema,
  ListPurchaseOrdersQuerySchema,
  UpdatePurchaseOrderSchema,
} from './purchase-orders.schema';
import type {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersQuery,
  UpdatePurchaseOrderInput,
} from './purchase-orders.schema';
import { PurchaseOrdersService } from './purchase-orders.service';

@Controller('v1/purchase-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @SkipRateLimit()
  @Get()
  @RequirePermissions({ action: 'READ', resource: 'PURCHASE_ORDER' })
  async findAll(
    @Query(new ZodValidationPipe(ListPurchaseOrdersQuerySchema))
    query: ListPurchaseOrdersQuery,
  ) {
    const result = await this.purchaseOrdersService.findAll(query);
    return result;
  }

  @Get(':id')
  @RequirePermissions({ action: 'READ', resource: 'PURCHASE_ORDER' })
  async findOne(@Param('id') id: string) {
    const result = await this.purchaseOrdersService.findOne(id);
    return ok(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ action: 'CREATE', resource: 'PURCHASE_ORDER' })
  async create(
    @Body(new ZodValidationPipe(CreatePurchaseOrderSchema))
    body: CreatePurchaseOrderInput,
  ) {
    const result = await this.purchaseOrdersService.create(body);
    return ok(result);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'UPDATE', resource: 'PURCHASE_ORDER' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePurchaseOrderSchema))
    body: UpdatePurchaseOrderInput,
  ) {
    const result = await this.purchaseOrdersService.update(id, body);
    return ok(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ action: 'DELETE', resource: 'PURCHASE_ORDER' })
  async remove(@Param('id') id: string) {
    await this.purchaseOrdersService.remove(id);
    return okNoContent();
  }
}
