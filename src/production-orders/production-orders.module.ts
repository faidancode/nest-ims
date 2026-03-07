import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { ProductionOrdersController } from './production-orders.controller';
import { ProductionOrder } from './production-order.entity';
import { ProductionOrdersService } from './production-orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductionOrder]), AuditLogsModule],
  controllers: [ProductionOrdersController],
  providers: [ProductionOrdersService, PermissionsGuard],
  exports: [ProductionOrdersService],
})
export class ProductionOrdersModule {}

