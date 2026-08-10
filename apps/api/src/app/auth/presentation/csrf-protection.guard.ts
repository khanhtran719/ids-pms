import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class CsrfProtectionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.header('x-csrf-protection') === '1') return true;

    throw new ForbiddenException({
      code: 'CSRF_PROTECTION_REQUIRED',
      message: 'CSRF protection header is required',
    });
  }
}
