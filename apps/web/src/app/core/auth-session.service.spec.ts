import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { AuthSessionResponse } from '@project-ql/api-contracts';
import { AuthSessionService } from './auth-session.service';
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
    permissions: ['users.read'],
  },
};

describe('AuthSessionService', () => {
  let service: AuthSessionService;
  let store: AuthSessionStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthSessionService);
    store = TestBed.inject(AuthSessionStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('restores a session once through the refresh cookie', () => {
    const outcomes: boolean[] = [];
    service.initialize().subscribe((result) => outcomes.push(result));
    const request = http.expectOne('/api/v1/auth/refresh');
    expect(request.request.method).toBe('POST');
    request.flush(SESSION);

    service.initialize().subscribe((result) => outcomes.push(result));

    expect(outcomes).toEqual([true, true]);
    expect(store.user()?.id).toBe('user-1');
    http.expectNone('/api/v1/auth/refresh');
  });

  it('marks the browser anonymous when refresh is unavailable', () => {
    let result: boolean | undefined;
    service.initialize().subscribe((value) => (result = value));
    http
      .expectOne('/api/v1/auth/refresh')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(result).toBe(false);
    expect(store.isAuthenticated()).toBe(false);
  });

  it('stores a successful email and password login', () => {
    service
      .login({ email: 'admin@example.com', password: 'password-123!' })
      .subscribe();
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.body).toEqual({
      email: 'admin@example.com',
      password: 'password-123!',
    });
    request.flush(SESSION);

    expect(store.accessToken()).toBe('access-token');
  });

  it('renews the in-memory access token before it expires', () => {
    jest.useFakeTimers();
    service
      .login({ email: 'admin@example.com', password: 'password-123!' })
      .subscribe();
    http.expectOne('/api/v1/auth/login').flush({
      ...SESSION,
      expiresInSeconds: 120,
    });

    jest.advanceTimersByTime(60_000);
    const refresh = http.expectOne('/api/v1/auth/refresh');
    refresh.flush({ ...SESSION, accessToken: 'renewed-access-token' });

    expect(store.accessToken()).toBe('renewed-access-token');
    jest.useRealTimers();
  });
});
