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
import { ZodValidationPipe } from '../common/http/zod.validation.pipe';
import { ok, okNoContent } from '../common/http/response';
import {
  CreatePartSchema,
  ListPartsQuerySchema,
  UpdatePartSchema,
} from './parts.schema';
import type {
  CreatePartInput,
  ListPartsQuery,
  UpdatePartInput,
} from './parts.schema';
import { PartsService } from './parts.service';

@Controller('v1/parts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @SkipRateLimit()
  @Get()
  @RequirePermissions({ action: 'READ', resource: 'PART' })
  async findAll(
    @Query(new ZodValidationPipe(ListPartsQuerySchema))
    query: ListPartsQuery,
  ) {
    const result = await this.partsService.findAll(query);
    return result;
  }

  @Get(':id')
  @RequirePermissions({ action: 'READ', resource: 'PART' })
  async findOne(@Param('id') id: string) {
    const result = await this.partsService.findOne(id);
    return ok(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ action: 'CREATE', resource: 'PART' })
  async create(
    @Body(new ZodValidationPipe(CreatePartSchema))
    body: CreatePartInput,
  ) {
    const result = await this.partsService.create(body);
    return ok(result);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'UPDATE', resource: 'PART' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePartSchema))
    body: UpdatePartInput,
  ) {
    const result = await this.partsService.update(id, body);
    return ok(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ action: 'DELETE', resource: 'PART' })
  async remove(@Param('id') id: string) {
    await this.partsService.remove(id);
    return okNoContent();
  }
}
