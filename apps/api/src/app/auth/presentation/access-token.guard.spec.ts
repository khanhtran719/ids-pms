import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthTokenService } from '../application/auth.ports';
import { AccessTokenGuard } from './access-token.guard';

describe('AccessTokenGuard', () => {
  const tokens = {
    verifyAccessToken: jest.fn(),
  } as unknown as jest.Mocked<AuthTokenService>;
  const guard = new AccessTokenGuard(tokens);

  beforeEach(() => jest.clearAllMocks());

  it('attaches verified auth context for a bearer token', async () => {
    const request: Record<string, unknown> = {
      headers: { authorization: 'Bearer valid-token' },
    };
    tokens.verifyAccessToken.mockResolvedValue({
      subject: 'user-id',
      email: 'admin@example.com',
      roleCodes: ['admin'],
      permissions: ['users.manage'],
    });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request['auth']).toEqual(
      expect.objectContaining({ subject: 'user-id' }),
    );
  });

  it('rejects requests without a bearer token', async () => {
    await expect(
      guard.canActivate(createContext({ headers: {} })),
    ).rejects.toThrow(UnauthorizedException);
  });
});

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}
