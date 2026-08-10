import type {
  PermissionCode,
  UserRoleCode,
  UserStatus,
} from '@project-ql/api-contracts';

export interface AuthenticationUserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  status: UserStatus;
  roleCodes: readonly UserRoleCode[];
}

export interface UserRepository {
  findByEmailForAuthentication(
    email: string,
  ): Promise<AuthenticationUserRecord | null>;
  findByIdForAuthentication(
    userId: string,
  ): Promise<AuthenticationUserRecord | null>;
}

export interface RoleRepository {
  findPermissionsByRoleCodes(
    roleCodes: readonly UserRoleCode[],
  ): Promise<PermissionCode[]>;
}

export interface RefreshSessionClient {
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateRefreshSession extends RefreshSessionClient {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RefreshSessionRepository {
  create(session: CreateRefreshSession): Promise<void>;
  consume(tokenHash: string): Promise<{ userId: string } | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
}

export interface AccessTokenPayload {
  subject: string;
  email: string;
  roleCodes: UserRoleCode[];
  permissions: PermissionCode[];
}

export interface AuthTokenService {
  createAccessToken(
    user: AuthenticationUserRecord,
    permissions: PermissionCode[],
  ): Promise<{ token: string; expiresInSeconds: number }>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;
  createRefreshToken(): {
    token: string;
    tokenHash: string;
    expiresAt: Date;
  };
  hashRefreshToken(token: string): string;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');
export const REFRESH_SESSION_REPOSITORY = Symbol('REFRESH_SESSION_REPOSITORY');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const AUTH_TOKEN_SERVICE = Symbol('AUTH_TOKEN_SERVICE');
