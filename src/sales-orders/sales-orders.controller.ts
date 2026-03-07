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
  CreateSalesOrderSchema,
  ListSalesOrdersQuerySchema,
  UpdateSalesOrderSchema,
} from './sales-orders.schema';
import type {
  CreateSalesOrderInput,
  ListSalesOrdersQuery,
  UpdateSalesOrderInput,
} from './sales-orders.schema';
import { SalesOrdersService } from './sales-orders.service';

@Controller('v1/sales-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @SkipRateLimit()
  @Get()
  @RequirePermissions({ action: 'READ', resource: 'SALES_ORDER' })
  async findAll(
    @Query(new ZodValidationPipe(ListSalesOrdersQuerySchema))
    query: ListSalesOrdersQuery,
  ) {
    const result = await this.salesOrdersService.findAll(query);
    return result;
  }

  @Get(':id')
  @RequirePermissions({ action: 'READ', resource: 'SALES_ORDER' })
  async findOne(@Param('id') id: string) {
    const result = await this.salesOrdersService.findOne(id);
    return ok(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ action: 'CREATE', resource: 'SALES_ORDER' })
  async create(
    @Body(new ZodValidationPipe(CreateSalesOrderSchema))
    body: CreateSalesOrderInput,
  ) {
    const result = await this.salesOrdersService.create(body);
    return ok(result);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'UPDATE', resource: 'SALES_ORDER' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSalesOrderSchema))
    body: UpdateSalesOrderInput,
  ) {
    const result = await this.salesOrdersService.update(id, body);
    return ok(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ action: 'DELETE', resource: 'SALES_ORDER' })
  async remove(@Param('id') id: string) {
    await this.salesOrdersService.remove(id);
    return okNoContent();
  }
}
