import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { WarehouseModule } from './warehouses/warehouses.module';
import { RateLimitService } from './common/rate-limit/rate-limit.service';
import { RequestIdInterceptor } from './common/http/request-id.interceptor';
import { LoggingInterceptor } from './common/http/logging.interceptor';
import { APP_GUARD } from '@nestjs/core';
import { GlobalRateLimitGuard } from './common/rate-limit/global-rate-limit.guard';
import { AppConfigModule } from './config/app-config.module';
import { PartsModule } from './parts/parts.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CustomersModule } from './customers/customers.module';
import { InventoriesModule } from './inventories/inventories.module';
import { InventoryTransactionsModule } from './inventory-transactions/inventory-transactions.module';

@Module({
  //agar tidak perlu import config module
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppConfigModule,
    DatabaseModule,
    AuthModule,
    WarehouseModule,
    PartsModule,
    SuppliersModule,
    CustomersModule,
    InventoriesModule,
    InventoryTransactionsModule,
  ],
  controllers: [],
  providers: [
    RateLimitService,
    RequestIdInterceptor,
    LoggingInterceptor,
    // Global guard: 100 req / 15m per IP
    {
      provide: APP_GUARD,
      useClass: GlobalRateLimitGuard,
    },
  ],
})
export class AppModule {}
