import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { Inventory } from './inventory.entity';
import { InventoriesController } from './inventories.controller';
import { InventoriesService } from './inventories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory])],
  controllers: [InventoriesController],
  providers: [InventoriesService, PermissionsGuard],
  exports: [InventoriesService],
})
export class InventoriesModule {}
