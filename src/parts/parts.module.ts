import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import { Part } from './part.entity';
import { PartsService } from './parts.service';
import { PartsController } from './parts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Part])],
  controllers: [PartsController],
  providers: [PartsService, PermissionsGuard],
  exports: [PartsService],
})
export class PartsModule {}
