import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthSessionService } from '../../core/auth-session.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  const loginResult = new Subject<never>();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthSessionService,
          useValue: { login: jest.fn(() => loginResult) },
        },
      ],
    }).compileComponents();
  });

  it('starts with an accessible invalid form and validates required fields', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
    expect(
      fixture.nativeElement.querySelector('label[for="email"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('label[for="password"]'),
    ).toBeTruthy();
  });

  it('shows a safe error when authentication fails', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.setValue({
      email: 'admin@example.com',
      password: 'invalid-password',
    });
    component.submit();
    loginResult.error(new Error('server internals'));
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[role="alert"]')?.textContent,
    ).toContain('Email hoặc mật khẩu không đúng');
    expect(fixture.nativeElement.textContent).not.toContain('server internals');
  });
});
