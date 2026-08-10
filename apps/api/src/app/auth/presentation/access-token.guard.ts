import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AUTH_TOKEN_SERVICE,
  type AuthTokenService,
} from '../application/auth.ports';
import type { AuthenticatedRequest } from './auth-request';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(AUTH_TOKEN_SERVICE) private readonly tokens: AuthTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token =
      authorization?.startsWith('Bearer ') && authorization.length > 7
        ? authorization.slice(7)
        : null;
    if (!token) throw this.unauthorized();

    try {
      request.auth = await this.tokens.verifyAccessToken(token);
      return true;
    } catch {
      throw this.unauthorized();
    }
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_ACCESS_TOKEN',
      message: 'Authentication is required',
    });
  }
}
