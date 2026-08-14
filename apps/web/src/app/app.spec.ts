import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { AuthSessionService } from './core/auth-session.service';
import { AuthSessionStore } from './core/auth-session.store';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: AuthSessionService,
          useValue: { logout: () => of(undefined) },
        },
      ],
    }).compileComponents();
  });

  it('leaves the public authentication route free of private navigation', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('aside')).toBeNull();
  });

  it('shows the authorized navigation and current account', () => {
    const store = TestBed.inject(AuthSessionStore);
    store.setSession({
      accessToken: 'token',
      expiresInSeconds: 900,
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        displayName: 'Administrator',
        status: 'active',
        roleCodes: ['admin'],
        permissions: [
          'users.read',
          'projects.read',
          'tasks.read',
          'revenue.read',
        ],
      },
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tổng quan');
    expect(fixture.nativeElement.textContent).toContain('Người dùng');
    expect(fixture.nativeElement.textContent).toContain('Chất lượng');
    expect(fixture.nativeElement.textContent).toContain('Doanh thu');
    expect(fixture.nativeElement.textContent).toContain('Hoàn vốn');
    expect(fixture.nativeElement.textContent).toContain('Administrator');
  });
});
