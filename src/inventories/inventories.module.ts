import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { Inventory } from './inventory.entity';
import { InventoriesController } from './inventories.controller';
import { InventoriesService } from './inventories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory]), AuditLogsModule],
  controllers: [InventoriesController],
  providers: [InventoriesService, PermissionsGuard],
  exports: [InventoriesService],
})
export class InventoriesModule {}
