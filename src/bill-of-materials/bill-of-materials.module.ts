import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { BillOfMaterial } from './bill-of-material.entity';
import { BillOfMaterialsController } from './bill-of-materials.controller';
import { BillOfMaterialsService } from './bill-of-materials.service';

@Module({
  imports: [TypeOrmModule.forFeature([BillOfMaterial]), AuditLogsModule],
  controllers: [BillOfMaterialsController],
  providers: [BillOfMaterialsService, PermissionsGuard],
  exports: [BillOfMaterialsService],
})
export class BillOfMaterialsModule {}

