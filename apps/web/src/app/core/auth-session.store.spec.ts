import { TestBed } from '@angular/core/testing';
import type { AuthSessionResponse } from '@project-ql/api-contracts';
import { AuthSessionStore } from './auth-session.store';

const SESSION: AuthSessionResponse = {
  accessToken: 'access-token',
  expiresInSeconds: 900,
  user: {
    id: 'user-1',
    email: 'admin@example.com',
    displayName: 'Administrator',
    status: 'active',
    roleCodes: ['admin'],
    permissions: ['users.read', 'users.manage'],
  },
};

describe('AuthSessionStore', () => {
  it('keeps the access token in memory and exposes permissions', () => {
    const store = TestBed.inject(AuthSessionStore);

    store.setSession(SESSION);

    expect(store.accessToken()).toBe('access-token');
    expect(store.user()?.email).toBe('admin@example.com');
    expect(store.hasPermission('users.manage')).toBe(true);
    store.clear();
    expect(store.isAuthenticated()).toBe(false);
  });
});
