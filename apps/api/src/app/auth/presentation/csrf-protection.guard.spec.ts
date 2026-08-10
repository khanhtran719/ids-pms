import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { CsrfProtectionGuard } from './csrf-protection.guard';

describe('CsrfProtectionGuard', () => {
  const guard = new CsrfProtectionGuard();

  it('requires the explicit API request header', () => {
    expect(guard.canActivate(createContext('1'))).toBe(true);
    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});

function createContext(headerValue?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ header: () => headerValue }),
    }),
  } as ExecutionContext;
}
