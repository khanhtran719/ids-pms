import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import type { PermissionCode, UserRoleCode } from '@project-ql/api-contracts';
import type { EnvironmentVariables } from '../../core/config/environment';
import type {
  AccessTokenPayload,
  AuthenticationUserRecord,
  AuthTokenService,
} from '../application/auth.ports';

interface StoredAccessTokenPayload {
  sub: string;
  email: string;
  roleCodes: UserRoleCode[];
  permissions: PermissionCode[];
}

@Injectable()
export class JwtAuthTokenService implements AuthTokenService {
  private readonly issuer = 'ids-pms-api';
  private readonly audience = 'ids-pms-web';

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async createAccessToken(
    user: AuthenticationUserRecord,
    permissions: PermissionCode[],
  ): Promise<{ token: string; expiresInSeconds: number }> {
    const expiresInSeconds = this.config.getOrThrow('ACCESS_TOKEN_TTL_SECONDS');
    const token = await this.jwt.signAsync(
      {
        email: user.email,
        roleCodes: [...user.roleCodes],
        permissions,
      },
      {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        subject: user.id,
        issuer: this.issuer,
        audience: this.audience,
        expiresIn: expiresInSeconds,
      },
    );
    return { token, expiresInSeconds };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const payload = await this.jwt.verifyAsync<StoredAccessTokenPayload>(
      token,
      {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        issuer: this.issuer,
        audience: this.audience,
      },
    );
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      !Array.isArray(payload.roleCodes) ||
      !Array.isArray(payload.permissions)
    ) {
      throw new UnauthorizedException('Invalid access token payload');
    }
    return {
      subject: payload.sub,
      email: payload.email,
      roleCodes: payload.roleCodes,
      permissions: payload.permissions,
    };
  }

  createRefreshToken(): {
    token: string;
    tokenHash: string;
    expiresAt: Date;
  } {
    const token = randomBytes(32).toString('base64url');
    const ttlDays = this.config.getOrThrow('REFRESH_TOKEN_TTL_DAYS');
    return {
      token,
      tokenHash: this.hashRefreshToken(token),
      expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1_000),
    };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
