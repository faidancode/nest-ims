import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ok } from '../common/http/response';
import { ZodValidationPipe } from '../common/http/zod.validation.pipe';
import { RequirePermissions } from '../common/rbac/permissions.decorator';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { SkipRateLimit } from '../common/rate-limit/rate-limit-decorator';
import {
  ListAuditLogsQuerySchema,
} from './audit-logs.schema';
import type { ListAuditLogsQuery } from './audit-logs.schema';
import { AuditLogsService } from './audit-logs.service';

@Controller('v1/audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @SkipRateLimit()
  @Get()
  @RequirePermissions({ action: 'READ', resource: 'AUDIT_LOG' })
  async findAll(
    @Query(new ZodValidationPipe(ListAuditLogsQuerySchema))
    query: ListAuditLogsQuery,
  ) {
    const result = await this.auditLogsService.findAll(query);
    return result;
  }

  @Get(':id')
  @RequirePermissions({ action: 'READ', resource: 'AUDIT_LOG' })
  async findOne(@Param('id') id: string) {
    const result = await this.auditLogsService.findOne(id);
    return ok(result);
  }
}
