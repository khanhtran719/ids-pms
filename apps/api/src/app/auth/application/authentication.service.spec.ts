import { AuthenticationService } from './authentication.service';
import type {
  AuthTokenService,
  PasswordHasher,
  RefreshSessionRepository,
  RoleRepository,
  UserRepository,
} from './auth.ports';

describe('AuthenticationService', () => {
  const user = {
    id: '507f1f77bcf86cd799439011',
    email: 'admin@example.com',
    displayName: 'System Admin',
    passwordHash: 'password-hash',
    status: 'active' as const,
    roleCodes: ['admin'] as const,
  };
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let sessions: jest.Mocked<RefreshSessionRepository>;
  let passwords: jest.Mocked<PasswordHasher>;
  let tokens: jest.Mocked<AuthTokenService>;
  let service: AuthenticationService;

  beforeEach(() => {
    users = {
      findByEmailForAuthentication: jest.fn(),
      findByIdForAuthentication: jest.fn(),
    };
    roles = { findPermissionsByRoleCodes: jest.fn() };
    sessions = {
      create: jest.fn(),
      consume: jest.fn(),
      deleteByTokenHash: jest.fn(),
    };
    passwords = { hash: jest.fn(), verify: jest.fn() };
    tokens = {
      createAccessToken: jest.fn(),
      createRefreshToken: jest.fn(),
      hashRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
    };
    service = new AuthenticationService(
      users,
      roles,
      sessions,
      passwords,
      tokens,
    );
  });

  it('logs in an active user without exposing password data', async () => {
    users.findByEmailForAuthentication.mockResolvedValue(user);
    passwords.verify.mockResolvedValue(true);
    roles.findPermissionsByRoleCodes.mockResolvedValue(['users.read']);
    tokens.createAccessToken.mockResolvedValue({
      token: 'access-token',
      expiresInSeconds: 900,
    });
    tokens.createRefreshToken.mockReturnValue({
      token: 'refresh-token',
      tokenHash: 'refresh-token-hash',
      expiresAt: new Date('2026-09-09T00:00:00.000Z'),
    });

    await expect(
      service.login({
        email: '  ADMIN@EXAMPLE.COM ',
        password: 'correct horse battery staple',
        client: { ipAddress: '127.0.0.1', userAgent: 'jest' },
      }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      expiresInSeconds: 900,
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: new Date('2026-09-09T00:00:00.000Z'),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        status: user.status,
        roleCodes: ['admin'],
        permissions: ['users.read'],
      },
    });
    expect(users.findByEmailForAuthentication).toHaveBeenCalledWith(
      'admin@example.com',
    );
    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        tokenHash: 'refresh-token-hash',
      }),
    );
  });

  it('uses one generic error for an unknown email or invalid password', async () => {
    users.findByEmailForAuthentication.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'not-the-password',
        client: {},
      }),
    ).rejects.toMatchObject({
      message: 'Invalid email or password',
    });
    expect(passwords.verify).not.toHaveBeenCalled();
  });

  it('rotates a refresh token so it can only be consumed once', async () => {
    tokens.hashRefreshToken.mockReturnValue('current-token-hash');
    sessions.consume.mockResolvedValue({ userId: user.id });
    users.findByIdForAuthentication.mockResolvedValue(user);
    roles.findPermissionsByRoleCodes.mockResolvedValue(['users.read']);
    tokens.createAccessToken.mockResolvedValue({
      token: 'next-access-token',
      expiresInSeconds: 900,
    });
    tokens.createRefreshToken.mockReturnValue({
      token: 'next-refresh-token',
      tokenHash: 'next-refresh-hash',
      expiresAt: new Date('2026-09-09T00:00:00.000Z'),
    });

    const result = await service.refresh('current-refresh-token', {
      ipAddress: '127.0.0.1',
    });

    expect(sessions.consume).toHaveBeenCalledWith('current-token-hash');
    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: 'next-refresh-hash' }),
    );
    expect(result.accessToken).toBe('next-access-token');
    expect(result.refreshToken).toBe('next-refresh-token');
  });
});
