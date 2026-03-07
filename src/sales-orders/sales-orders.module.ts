import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { SalesOrder } from './sales-order.entity';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([SalesOrder])],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService, PermissionsGuard],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}
