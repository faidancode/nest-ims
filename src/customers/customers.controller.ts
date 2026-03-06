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
  CreateCustomerSchema,
  ListCustomersQuerySchema,
  UpdateCustomerSchema,
} from './customers.schema';
import type {
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from './customers.schema';
import { CustomersService } from './customers.service';

@Controller('v1/customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @SkipRateLimit()
  @Get()
  @RequirePermissions({ action: 'READ', resource: 'CUSTOMER' })
  async findAll(
    @Query(new ZodValidationPipe(ListCustomersQuerySchema))
    query: ListCustomersQuery,
  ) {
    const result = await this.customersService.findAll(query);
    return result;
  }

  @Get(':id')
  @RequirePermissions({ action: 'READ', resource: 'CUSTOMER' })
  async findOne(@Param('id') id: string) {
    const result = await this.customersService.findOne(id);
    return ok(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ action: 'CREATE', resource: 'CUSTOMER' })
  async create(
    @Body(new ZodValidationPipe(CreateCustomerSchema))
    body: CreateCustomerInput,
  ) {
    const result = await this.customersService.create(body);
    return ok(result);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'UPDATE', resource: 'CUSTOMER' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCustomerSchema))
    body: UpdateCustomerInput,
  ) {
    const result = await this.customersService.update(id, body);
    return ok(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ action: 'DELETE', resource: 'CUSTOMER' })
  async remove(@Param('id') id: string) {
    await this.customersService.remove(id);
    return okNoContent();
  }
}
