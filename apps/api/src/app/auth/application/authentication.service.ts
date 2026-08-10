import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthUser } from '@project-ql/api-contracts';
import {
  AUTH_TOKEN_SERVICE,
  type AuthTokenService,
  PASSWORD_HASHER,
  type PasswordHasher,
  REFRESH_SESSION_REPOSITORY,
  type RefreshSessionClient,
  type RefreshSessionRepository,
  ROLE_REPOSITORY,
  type RoleRepository,
  USER_REPOSITORY,
  type UserRepository,
  type AuthenticationUserRecord,
} from './auth.ports';

export interface AuthenticationResult {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: AuthUser;
}

@Injectable()
export class AuthenticationService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(REFRESH_SESSION_REPOSITORY)
    private readonly sessions: RefreshSessionRepository,
    @Inject(PASSWORD_HASHER) private readonly passwords: PasswordHasher,
    @Inject(AUTH_TOKEN_SERVICE) private readonly tokens: AuthTokenService,
  ) {}

  async login(command: {
    email: string;
    password: string;
    client: RefreshSessionClient;
  }): Promise<AuthenticationResult> {
    const email = command.email.trim().toLowerCase();
    const user = await this.users.findByEmailForAuthentication(email);
    if (!user || user.status !== 'active') {
      throw this.invalidCredentials();
    }

    const passwordMatches = await this.passwords.verify(
      user.passwordHash,
      command.password,
    );
    if (!passwordMatches) {
      throw this.invalidCredentials();
    }

    return this.createSession(user, command.client);
  }

  async refresh(
    refreshToken: string,
    client: RefreshSessionClient,
  ): Promise<AuthenticationResult> {
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    const session = await this.sessions.consume(tokenHash);
    if (!session) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_SESSION',
        message: 'Refresh session is invalid or expired',
      });
    }

    const user = await this.users.findByIdForAuthentication(session.userId);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException({
        code: 'ACCOUNT_UNAVAILABLE',
        message: 'Account is unavailable',
      });
    }

    return this.createSession(user, client);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await this.sessions.deleteByTokenHash(
      this.tokens.hashRefreshToken(refreshToken),
    );
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await this.users.findByIdForAuthentication(userId);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException({
        code: 'ACCOUNT_UNAVAILABLE',
        message: 'Account is unavailable',
      });
    }
    const permissions = await this.roles.findPermissionsByRoleCodes(
      user.roleCodes,
    );
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      roleCodes: [...user.roleCodes],
      permissions,
    };
  }

  private async createSession(
    user: AuthenticationUserRecord,
    client: RefreshSessionClient,
  ): Promise<AuthenticationResult> {
    const permissions = await this.roles.findPermissionsByRoleCodes(
      user.roleCodes,
    );
    const [access, refresh] = await Promise.all([
      this.tokens.createAccessToken(user, permissions),
      Promise.resolve(this.tokens.createRefreshToken()),
    ]);
    await this.sessions.create({
      userId: user.id,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
      ...client,
    });

    return {
      accessToken: access.token,
      expiresInSeconds: access.expiresInSeconds,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        status: user.status,
        roleCodes: [...user.roleCodes],
        permissions,
      },
    };
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  }
}
