import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { InventoryTransaction } from './inventory-transaction.entity';
import { InventoryTransactionsController } from './inventory-transactions.controller';
import { InventoryTransactionsService } from './inventory-transactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryTransaction]), AuditLogsModule],
  controllers: [InventoryTransactionsController],
  providers: [InventoryTransactionsService, PermissionsGuard],
  exports: [InventoryTransactionsService],
})
export class InventoryTransactionsModule {}
