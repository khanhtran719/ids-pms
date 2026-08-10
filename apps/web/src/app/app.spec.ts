import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { App } from './app';
import {
  SystemHealth,
  SystemHealthService,
} from './core/system-health.service';

describe('App', () => {
  let healthResponse: Subject<SystemHealth>;

  beforeEach(async () => {
    healthResponse = new Subject<SystemHealth>();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: SystemHealthService,
          useValue: {
            getStatus: jest.fn(() => healthResponse),
          },
        },
      ],
    }).compileComponents();
  });

  it('shows a loading state while the platform status is being checked', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Đang kiểm tra nền tảng',
    );
  });

  it('shows API and MongoDB availability after the health request succeeds', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    healthResponse.next({
      status: 'ok',
      services: { api: 'up', database: 'up' },
      timestamp: '2026-08-10T00:00:00.000Z',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain(
      'IDS PMS',
    );
    expect(fixture.nativeElement.textContent).toContain('API sẵn sàng');
    expect(fixture.nativeElement.textContent).toContain('MongoDB đã kết nối');
  });

  it('shows an actionable error state when the health request fails', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    healthResponse.error(new Error('API unavailable'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Không thể kết nối nền tảng',
    );
    expect(
      fixture.nativeElement.querySelector('button')?.textContent,
    ).toContain('Thử lại');
  });
});
