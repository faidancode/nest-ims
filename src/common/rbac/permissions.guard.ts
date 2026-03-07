import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import type { JwtPayload } from '../../auth/auth.schema';
import {
  REQUIRED_PERMISSIONS_KEY,
  RequiredPermission,
} from '../constants/rbac-constants';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<RequiredPermission[]>(
        REQUIRED_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Authentication is required');
    }

    const userPermissions = await this.dataSource.query(
      `
        SELECT DISTINCT p.action, p.resource
        FROM user_roles ur
        INNER JOIN roles r ON r.id = ur.role_id
        INNER JOIN role_permissions rp ON rp.role_id = r.id
        INNER JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = ?
          AND ur.deleted_at IS NULL
          AND r.deleted_at IS NULL
          AND r.is_active = TRUE
          AND rp.deleted_at IS NULL
          AND p.deleted_at IS NULL
      `,
      [userId],
    );

    const permissionSet = new Set(
      userPermissions.map(
        (permission: { action: string; resource: string }) =>
          `${permission.action}:${permission.resource}`,
      ),
    );

    const isDebugEnabled = process.env.RBAC_DEBUG === 'true';
    if (isDebugEnabled) {
      console.log("DEBUG")
      this.logger.debug(
        JSON.stringify({
          userId,
          requiredPermissions,
          permissionCount: permissionSet.size,
          permissions: [...permissionSet].sort(),
        }),
      );
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      permissionSet.has(`${permission.action}:${permission.resource}`),
    );

    if (!hasAllPermissions) {
      if (isDebugEnabled) {
        const missingPermissions = requiredPermissions.filter(
          (permission) =>
            !permissionSet.has(`${permission.action}:${permission.resource}`),
        );
        this.logger.warn(
          JSON.stringify({
            userId,
            requiredPermissions,
            missingPermissions,
          }),
        );
      }

      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
