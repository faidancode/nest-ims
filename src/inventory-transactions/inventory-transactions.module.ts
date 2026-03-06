import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { InventoryTransaction } from './inventory-transaction.entity';
import { InventoryTransactionsController } from './inventory-transactions.controller';
import { InventoryTransactionsService } from './inventory-transactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryTransaction])],
  controllers: [InventoryTransactionsController],
  providers: [InventoryTransactionsService, PermissionsGuard],
  exports: [InventoryTransactionsService],
})
export class InventoryTransactionsModule {}
