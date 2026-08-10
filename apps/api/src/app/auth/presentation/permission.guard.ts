import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionCode } from '@project-ql/api-contracts';
import type { AuthenticatedRequest } from './auth-request';
import { REQUIRED_PERMISSIONS } from './permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(
      REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const granted = new Set(request.auth?.permissions ?? []);
    if (required.every((permission) => granted.has(permission))) return true;

    throw new ForbiddenException({
      code: 'INSUFFICIENT_PERMISSION',
      message: 'You do not have permission to perform this action',
    });
  }
}
