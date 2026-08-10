import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthSessionService } from './auth-session.service';
import { AuthSessionStore } from './auth-session.store';
import { authGuard, permissionGuard } from './auth.guards';

describe('auth guards', () => {
  it('redirects anonymous visitors to login with their return URL', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthSessionService,
          useValue: { initialize: () => of(false) },
        },
      ],
    });

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/users' } as never),
    ).toPromise();

    expect(TestBed.inject(Router).serializeUrl(result as never)).toBe(
      '/login?returnUrl=%2Fusers',
    );
  });

  it('sends authenticated users without the required permission to unauthorized', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthSessionService,
          useValue: { initialize: () => of(true) },
        },
      ],
    });
    const store = TestBed.inject(AuthSessionStore);
    store.setSession({
      accessToken: 'token',
      expiresInSeconds: 900,
      user: {
        id: 'user-1',
        email: 'member@example.com',
        displayName: 'Member',
        status: 'active',
        roleCodes: ['member'],
        permissions: ['projects.read'],
      },
    });

    const guard = permissionGuard('users.read');
    const result = await TestBed.runInInjectionContext(() =>
      guard({} as never, { url: '/users' } as never),
    ).toPromise();

    expect(TestBed.inject(Router).serializeUrl(result as never)).toBe(
      '/unauthorized',
    );
  });
});
