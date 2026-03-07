import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { Part } from './part.entity';
import { PartsService } from './parts.service';
import { PartsController } from './parts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Part]), AuditLogsModule],
  controllers: [PartsController],
  providers: [PartsService, PermissionsGuard],
  exports: [PartsService],
})
export class PartsModule {}
