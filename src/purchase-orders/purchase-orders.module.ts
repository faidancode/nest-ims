import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { PurchaseOrder } from './purchase-order.entity';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseOrder]), AuditLogsModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService, PermissionsGuard],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
