import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { EnvironmentVariables } from '../../core/config/environment';
import type { AuthenticationUserRecord } from '../application/auth.ports';
import { JwtAuthTokenService } from './jwt-auth-token.service';

describe('JwtAuthTokenService', () => {
  const user: AuthenticationUserRecord = {
    id: '507f1f77bcf86cd799439011',
    email: 'admin@example.com',
    displayName: 'Administrator',
    passwordHash: 'hash',
    status: 'active',
    roleCodes: ['admin'],
  };
  const values = {
    JWT_ACCESS_SECRET: 'test-secret-that-is-long-enough-for-jwt',
    ACCESS_TOKEN_TTL_SECONDS: 900,
    REFRESH_TOKEN_TTL_DAYS: 30,
  };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let config: { getOrThrow: jest.Mock };
  let service: JwtAuthTokenService;

  beforeEach(() => {
    jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
    config = {
      getOrThrow: jest.fn((key: keyof typeof values) => values[key]),
    };
    service = new JwtAuthTokenService(
      jwt as unknown as JwtService,
      config as unknown as ConfigService<EnvironmentVariables, true>,
    );
  });

  afterEach(() => jest.useRealTimers());

  it('signs the stable access-token claims and options', async () => {
    jwt.signAsync.mockResolvedValue('signed-access-token');

    await expect(
      service.createAccessToken(user, ['users.read', 'projects.read']),
    ).resolves.toEqual({
      token: 'signed-access-token',
      expiresInSeconds: 900,
    });
    expect(jwt.signAsync).toHaveBeenCalledWith(
      {
        email: user.email,
        roleCodes: ['admin'],
        permissions: ['users.read', 'projects.read'],
      },
      {
        secret: values.JWT_ACCESS_SECRET,
        subject: user.id,
        issuer: 'ids-pms-api',
        audience: 'ids-pms-web',
        expiresIn: 900,
      },
    );
  });

  it('verifies and maps a valid access-token payload', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: user.id,
      email: user.email,
      roleCodes: ['admin'],
      permissions: ['projects.manage'],
    });

    await expect(service.verifyAccessToken('token')).resolves.toEqual({
      subject: user.id,
      email: user.email,
      roleCodes: ['admin'],
      permissions: ['projects.manage'],
    });
    expect(jwt.verifyAsync).toHaveBeenCalledWith('token', {
      secret: values.JWT_ACCESS_SECRET,
      issuer: 'ids-pms-api',
      audience: 'ids-pms-web',
    });
  });

  it.each([
    { email: user.email, roleCodes: ['admin'], permissions: [] },
    { sub: user.id, roleCodes: ['admin'], permissions: [] },
    { sub: user.id, email: user.email, roleCodes: 'admin', permissions: [] },
    {
      sub: user.id,
      email: user.email,
      roleCodes: ['admin'],
      permissions: 'projects.read',
    },
  ])('rejects an invalid access-token payload %#', async (payload) => {
    jwt.verifyAsync.mockResolvedValue(payload);

    await expect(service.verifyAccessToken('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('creates a hashed refresh token with the configured expiry', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-10T00:00:00.000Z'));

    const refresh = service.createRefreshToken();

    expect(refresh.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(refresh.tokenHash).toBe(service.hashRefreshToken(refresh.token));
    expect(refresh.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(refresh.expiresAt).toEqual(new Date('2026-09-09T00:00:00.000Z'));
  });
});
