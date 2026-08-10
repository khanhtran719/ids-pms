import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import type { SystemHealth } from '../../core/system-health.service';
import { SystemHealthService } from '../../core/system-health.service';
import { DashboardPage } from './dashboard.page';

describe('DashboardPage', () => {
  it('renders health loading, error/retry and ready states', async () => {
    const first = new Subject<SystemHealth>();
    const retry = new Subject<SystemHealth>();
    const getStatus = jest
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(retry);
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [{ provide: SystemHealthService, useValue: { getStatus } }],
    }).compileComponents();
    TestBed.inject(AuthSessionStore).setSession({
      accessToken: 'token',
      expiresInSeconds: 900,
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        displayName: 'Administrator',
        status: 'active',
        roleCodes: ['admin'],
        permissions: ['projects.read'],
      },
    });
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Đang kiểm tra');

    first.error(new Error('offline'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Không thể kiểm tra dịch vụ',
    );
    fixture.nativeElement.querySelector('button').click();
    retry.next({
      status: 'ok',
      services: { api: 'up', database: 'up' },
      timestamp: '2026-08-10T00:00:00.000Z',
    });
    fixture.detectChanges();

    expect(getStatus).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Phản hồi bình thường');
    expect(fixture.nativeElement.textContent).toContain('Đã kết nối');
  });
});
