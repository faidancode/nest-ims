import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { WarehouseController } from './warehouses.controller';
import { Warehouse } from './warehouse.entity';
import { WarehouseService } from './warehouses.service';

@Module({
  imports: [TypeOrmModule.forFeature([Warehouse])],
  controllers: [WarehouseController],
  providers: [WarehouseService, PermissionsGuard],
  exports: [WarehouseService],
})
export class WarehouseModule {}
