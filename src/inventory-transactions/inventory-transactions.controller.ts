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
  CreateInventoryTransactionSchema,
  ListInventoryTransactionsQuerySchema,
  UpdateInventoryTransactionSchema,
} from './inventory-transactions.schema';
import type {
  CreateInventoryTransactionInput,
  ListInventoryTransactionsQuery,
  UpdateInventoryTransactionInput,
} from './inventory-transactions.schema';
import { InventoryTransactionsService } from './inventory-transactions.service';

@Controller('v1/inventory-transactions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryTransactionsController {
  constructor(
    private readonly inventoryTransactionsService: InventoryTransactionsService,
  ) {}

  @SkipRateLimit()
  @Get()
  @RequirePermissions({ action: 'READ', resource: 'INVENTORY_TRANSACTION' })
  async findAll(
    @Query(new ZodValidationPipe(ListInventoryTransactionsQuerySchema))
    query: ListInventoryTransactionsQuery,
  ) {
    const result = await this.inventoryTransactionsService.findAll(query);
    return result;
  }

  @Get(':id')
  @RequirePermissions({ action: 'READ', resource: 'INVENTORY_TRANSACTION' })
  async findOne(@Param('id') id: string) {
    const result = await this.inventoryTransactionsService.findOne(id);
    return ok(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ action: 'CREATE', resource: 'INVENTORY_TRANSACTION' })
  async create(
    @Body(new ZodValidationPipe(CreateInventoryTransactionSchema))
    body: CreateInventoryTransactionInput,
  ) {
    const result = await this.inventoryTransactionsService.create(body);
    return ok(result);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'UPDATE', resource: 'INVENTORY_TRANSACTION' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateInventoryTransactionSchema))
    body: UpdateInventoryTransactionInput,
  ) {
    const result = await this.inventoryTransactionsService.update(id, body);
    return ok(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ action: 'DELETE', resource: 'INVENTORY_TRANSACTION' })
  async remove(@Param('id') id: string) {
    await this.inventoryTransactionsService.remove(id);
    return okNoContent();
  }
}
