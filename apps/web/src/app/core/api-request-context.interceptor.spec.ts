import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  apiRequestContextInterceptor,
  CLIENT_REQUEST_ID_FACTORY,
} from './api-request-context.interceptor';
import { AuthSessionStore } from './auth-session.store';

describe('apiRequestContextInterceptor', () => {
  it('adds JSON and correlation headers to API requests', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiRequestContextInterceptor])),
        provideHttpClientTesting(),
        {
          provide: CLIENT_REQUEST_ID_FACTORY,
          useValue: () => 'client-request-123',
        },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const client = TestBed.inject(HttpClient);

    client.get('/api/v1/health').subscribe();

    const request = http.expectOne('/api/v1/health');
    expect(request.request.headers.get('Accept')).toBe('application/json');
    expect(request.request.headers.get('X-Request-Id')).toBe(
      'client-request-123',
    );
    expect(request.request.withCredentials).toBe(true);
    request.flush({});
    http.verify();
  });

  it('adds the in-memory bearer token and CSRF header when applicable', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiRequestContextInterceptor])),
        provideHttpClientTesting(),
        {
          provide: CLIENT_REQUEST_ID_FACTORY,
          useValue: () => 'client-request-123',
        },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const client = TestBed.inject(HttpClient);
    const auth = TestBed.inject(AuthSessionStore);
    auth.setSession({
      accessToken: 'memory-only-token',
      expiresInSeconds: 900,
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        displayName: 'Administrator',
        status: 'active',
        roleCodes: ['admin'],
        permissions: [],
      },
    });

    client.post('/api/v1/users', {}).subscribe();

    const request = http.expectOne('/api/v1/users');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer memory-only-token',
    );
    expect(request.request.headers.get('X-CSRF-Protection')).toBe('1');
    request.flush({});
    http.verify();
  });
});
