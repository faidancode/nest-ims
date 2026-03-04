import { SetMetadata } from '@nestjs/common';
import {
  REQUIRED_PERMISSIONS_KEY,
  RequiredPermission,
} from '../constants/rbac-constants';

export const RequirePermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
