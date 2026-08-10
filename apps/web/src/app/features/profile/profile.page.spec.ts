import { TestBed } from '@angular/core/testing';
import { AuthSessionStore } from '../../core/auth-session.store';
import { ProfilePage } from './profile.page';

describe('ProfilePage', () => {
  it('renders the current account from the in-memory session', async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
    }).compileComponents();
    TestBed.inject(AuthSessionStore).setSession({
      accessToken: 'token',
      expiresInSeconds: 900,
      user: {
        id: 'user-1',
        email: 'member@example.com',
        displayName: 'Project Member',
        status: 'active',
        roleCodes: ['member'],
        permissions: ['projects.read'],
      },
    });

    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Project Member');
    expect(fixture.nativeElement.textContent).toContain('member@example.com');
    expect(fixture.nativeElement.textContent).toContain('member');
  });
});
