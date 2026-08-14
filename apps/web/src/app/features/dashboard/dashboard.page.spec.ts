import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { DashboardResponse } from '@project-ql/api-contracts';
import { Subject } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { DashboardService } from '../../core/dashboard.service';
import type { SystemHealth } from '../../core/system-health.service';
import { SystemHealthService } from '../../core/system-health.service';
import { DashboardPage } from './dashboard.page';

const SNAPSHOT: DashboardResponse = {
  fiscalYear: 2025,
  overview: {
    totalRevenue: 420_000_000,
    totalCost: 200_000_000,
    grossProfit: 220_000_000,
    grossMargin: 220 / 420,
    projectsWithRevenue: 2,
    totalProjects: 4,
    operationalProjects: 1,
    totalCarrierContracts: 3,
    teldataContracts: 2,
    ibsContracts: 1,
    totalTasks: 10,
    overdueTasks: 2,
    missingCapexProjects: 1,
    dataConflictProjects: 1,
  },
  quarters: [
    { quarter: 1, revenue: 120, cost: 80, grossProfit: 40 },
    { quarter: 2, revenue: 0, cost: 0, grossProfit: 0 },
    { quarter: 3, revenue: 0, cost: 0, grossProfit: 0 },
    { quarter: 4, revenue: 300, cost: 120, grossProfit: 180 },
  ],
  operationalStatuses: [
    { status: 'not_started', projects: 1 },
    { status: 'in_progress', projects: 2 },
    { status: 'partial', projects: 0 },
    { status: 'operational', projects: 1 },
  ],
  topRevenueProjects: [
    {
      projectId: 'project-1',
      projectCode: 'IDS-01',
      projectName: 'IDS Riverside',
      revenue: 300,
      cost: 120,
      grossProfit: 180,
    },
  ],
  carrierContractsByCarrier: [{ carrier: 'Viettel', contracts: 2 }],
};

describe('DashboardPage', () => {
  it('renders dashboard loading, error/retry and real portfolio data', async () => {
    const first = new Subject<DashboardResponse>();
    const retry = new Subject<DashboardResponse>();
    const getSnapshot = jest
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(retry);
    const health = new Subject<SystemHealth>();
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: { getSnapshot } },
        {
          provide: SystemHealthService,
          useValue: { getStatus: () => health },
        },
      ],
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
        permissions: [
          'projects.read',
          'tasks.read',
          'carrier-contracts.read',
          'revenue.read',
        ],
      },
    });

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Đang tổng hợp dữ liệu',
    );

    first.error(new Error('offline'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Không thể tải dữ liệu tổng quan',
    );
    fixture.nativeElement.querySelector('.dashboard-retry').click();
    retry.next(SNAPSHOT);
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(getSnapshot).toHaveBeenCalledTimes(2);
    expect(getSnapshot).toHaveBeenLastCalledWith(2025);
    expect(content).toContain('Tổng doanh thu');
    expect(content).toContain('4 dự án');
    expect(content).toContain('IDS Riverside');
    expect(content).toContain('Viettel');
    expect(content).toContain('Doanh thu và chi phí theo quý');
  });

  it('renders health error/retry and ready states independently', async () => {
    const first = new Subject<SystemHealth>();
    const retry = new Subject<SystemHealth>();
    const getStatus = jest
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(retry);
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        {
          provide: DashboardService,
          useValue: { getSnapshot: () => new Subject<DashboardResponse>() },
        },
        { provide: SystemHealthService, useValue: { getStatus } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    first.error(new Error('offline'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Không thể kiểm tra dịch vụ',
    );
    fixture.nativeElement.querySelector('.health-retry').click();
    retry.next({
      status: 'ok',
      services: { api: 'up', database: 'up' },
      timestamp: '2026-08-10T00:00:00.000Z',
    });
    fixture.detectChanges();

    expect(getStatus).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('API ổn định');
    expect(fixture.nativeElement.textContent).toContain('MongoDB kết nối');
  });
});
