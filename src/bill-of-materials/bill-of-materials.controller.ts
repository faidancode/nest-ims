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
  CreateBillOfMaterialSchema,
  ListBillOfMaterialsQuerySchema,
  UpdateBillOfMaterialSchema,
} from './bill-of-materials.schema';
import type {
  CreateBillOfMaterialInput,
  ListBillOfMaterialsQuery,
  UpdateBillOfMaterialInput,
} from './bill-of-materials.schema';
import { BillOfMaterialsService } from './bill-of-materials.service';

@Controller('v1/bill-of-materials')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillOfMaterialsController {
  constructor(private readonly billOfMaterialsService: BillOfMaterialsService) {}

  @SkipRateLimit()
  @Get()
  @RequirePermissions({ action: 'READ', resource: 'BILL_OF_MATERIAL' })
  async findAll(
    @Query(new ZodValidationPipe(ListBillOfMaterialsQuerySchema))
    query: ListBillOfMaterialsQuery,
  ) {
    const result = await this.billOfMaterialsService.findAll(query);
    return result;
  }

  @Get(':id')
  @RequirePermissions({ action: 'READ', resource: 'BILL_OF_MATERIAL' })
  async findOne(@Param('id') id: string) {
    const result = await this.billOfMaterialsService.findOne(id);
    return ok(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ action: 'CREATE', resource: 'BILL_OF_MATERIAL' })
  async create(
    @Body(new ZodValidationPipe(CreateBillOfMaterialSchema))
    body: CreateBillOfMaterialInput,
  ) {
    const result = await this.billOfMaterialsService.create(body);
    return ok(result);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'UPDATE', resource: 'BILL_OF_MATERIAL' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateBillOfMaterialSchema))
    body: UpdateBillOfMaterialInput,
  ) {
    const result = await this.billOfMaterialsService.update(id, body);
    return ok(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ action: 'DELETE', resource: 'BILL_OF_MATERIAL' })
  async remove(@Param('id') id: string) {
    await this.billOfMaterialsService.remove(id);
    return okNoContent();
  }
}

