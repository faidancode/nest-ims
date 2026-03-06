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
import { ZodValidationPipe } from '../common/http/zod.validation.pipe';
import { ok, okNoContent } from '../common/http/response';
import { RequirePermissions } from '../common/rbac/permissions.decorator';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { SkipRateLimit } from '../common/rate-limit/rate-limit-decorator';
import {
  CreateSupplierSchema,
  ListSuppliersQuerySchema,
  UpdateSupplierSchema,
} from './suppliers.schema';
import type {
  CreateSupplierInput,
  ListSuppliersQuery,
  UpdateSupplierInput,
} from './suppliers.schema';
import { SuppliersService } from './suppliers.service';

@Controller('v1/suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @SkipRateLimit()
  @Get()
  @RequirePermissions({ action: 'READ', resource: 'SUPPLIER' })
  async findAll(
    @Query(new ZodValidationPipe(ListSuppliersQuerySchema))
    query: ListSuppliersQuery,
  ) {
    const result = await this.suppliersService.findAll(query);
    return result;
  }

  @Get(':id')
  @RequirePermissions({ action: 'READ', resource: 'SUPPLIER' })
  async findOne(@Param('id') id: string) {
    const result = await this.suppliersService.findOne(id);
    return ok(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ action: 'CREATE', resource: 'SUPPLIER' })
  async create(
    @Body(new ZodValidationPipe(CreateSupplierSchema))
    body: CreateSupplierInput,
  ) {
    const result = await this.suppliersService.create(body);
    return ok(result);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'UPDATE', resource: 'SUPPLIER' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSupplierSchema))
    body: UpdateSupplierInput,
  ) {
    const result = await this.suppliersService.update(id, body);
    return ok(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ action: 'DELETE', resource: 'SUPPLIER' })
  async remove(@Param('id') id: string) {
    await this.suppliersService.remove(id);
    return okNoContent();
  }
}
