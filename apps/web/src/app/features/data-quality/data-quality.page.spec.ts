import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  AuthUser,
  DataQualityReportResponse,
} from '@project-ql/api-contracts';
import { of, throwError } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { DataQualityService } from '../../core/data-quality.service';
import { DataQualityPage } from './data-quality.page';

const RESPONSE: DataQualityReportResponse = {
  data: [
    {
      projectId: 'project-1',
      projectCode: 'IDS-01',
      projectName: 'IDS Riverside',
      investor: 'IDS Corporation',
      province: 'Hồ Chí Minh',
      issueTypes: ['data_conflict', 'missing_task_plan'],
      issueCount: 3,
      missingTaskPlanCount: 2,
      overdueTaskCount: 0,
      missingActualEndCount: 0,
      updatedAt: '2026-08-10T00:00:00.000Z',
    },
  ],
  meta: {
    page: 1,
    limit: 20,
    totalItems: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
  summary: {
    totalProjects: 4,
    affectedProjects: 2,
    totalIssues: 5,
    dataConflictProjects: 1,
    missingCapexProjects: 1,
    missingTaskPlanProjects: 2,
    overdueTasks: 1,
    missingActualEndTasks: 0,
  },
  opportunityQuality: {
    totalOpportunities: 7,
    affectedOpportunities: 4,
    totalIssues: 5,
    missingOwner: 2,
    missingLastInteraction: 3,
  },
};

describe('DataQualityPage', () => {
  let fixture: ComponentFixture<DataQualityPage>;
  let service: { getReport: jest.Mock };

  async function setup(response: DataQualityReportResponse = RESPONSE) {
    service = { getReport: jest.fn().mockReturnValue(of(response)) };
    await TestBed.configureTestingModule({
      imports: [DataQualityPage],
      providers: [
        provideRouter([]),
        { provide: DataQualityService, useValue: service },
      ],
    }).compileComponents();
    TestBed.inject(AuthSessionStore).setSession('token', {
      id: 'user-1',
      email: 'member@example.com',
      displayName: 'Member',
      status: 'active',
      roleCodes: ['member'],
      permissions: ['projects.read', 'tasks.read', 'opportunities.read'],
    } satisfies AuthUser);
    fixture = TestBed.createComponent(DataQualityPage);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders portfolio KPIs, issue labels and project actions', async () => {
    await setup();

    expect(fixture.nativeElement.textContent).toContain('Chất lượng dữ liệu');
    expect(fixture.nativeElement.textContent).toContain('2/4');
    expect(fixture.nativeElement.textContent).toContain('IDS Riverside');
    expect(fixture.nativeElement.textContent).toContain('Xung đột nguồn');
    expect(fixture.nativeElement.textContent).toContain('Thiếu kế hoạch');
    expect(
      fixture.nativeElement.querySelector('a[href="/projects/project-1"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Hồ sơ CRM cần bổ sung');
    expect(fixture.nativeElement.textContent).toContain('4/7');
    expect(
      fixture.nativeElement.querySelector('a[href="/opportunities"]'),
    ).not.toBeNull();
  });

  it('applies issue filters immediately and debounces project search', async () => {
    jest.useFakeTimers();
    await setup();
    const component = fixture.componentInstance as unknown as {
      issueTypeFilter: { setValue(value: string): void };
      searchControl: { setValue(value: string): void };
    };

    component.issueTypeFilter.setValue('overdue_task');
    expect(service.getReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ issueType: 'overdue_task', page: 1 }),
    );

    component.searchControl.setValue('Riverside');
    jest.advanceTimersByTime(299);
    expect(service.getReport).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(1);
    expect(service.getReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Riverside', page: 1 }),
    );
    jest.useRealTimers();
  });

  it('renders an empty state when the selected scope is clean', async () => {
    await setup({
      ...RESPONSE,
      data: [],
      meta: { ...RESPONSE.meta, totalItems: 0, totalPages: 0 },
      summary: {
        ...RESPONSE.summary,
        affectedProjects: 0,
        totalIssues: 0,
      },
    });

    expect(fixture.nativeElement.textContent).toContain(
      'Không phát hiện cảnh báo',
    );
  });

  it('paginates within report bounds and clears all filters in one reload', async () => {
    await setup({
      ...RESPONSE,
      meta: {
        ...RESPONSE.meta,
        page: 2,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
    });
    const component = fixture.componentInstance as unknown as {
      page: { (): number; set(value: number): void };
      searchControl: { setValue(value: string, options?: object): void };
      issueTypeFilter: { setValue(value: string, options?: object): void };
      previousPage(): void;
      nextPage(): void;
      clearFilters(): void;
    };

    component.page.set(2);
    component.previousPage();
    expect(component.page()).toBe(1);
    expect(service.getReport).toHaveBeenLastCalledWith({ page: 1, limit: 20 });

    const afterPrevious = service.getReport.mock.calls.length;
    component.previousPage();
    expect(service.getReport).toHaveBeenCalledTimes(afterPrevious);

    component.nextPage();
    expect(component.page()).toBe(2);
    expect(service.getReport).toHaveBeenLastCalledWith({ page: 2, limit: 20 });

    component.searchControl.setValue('IDS', { emitEvent: false });
    component.issueTypeFilter.setValue('missing_capex', { emitEvent: false });
    component.clearFilters();
    expect(component.page()).toBe(1);
    expect(service.getReport).toHaveBeenLastCalledWith({ page: 1, limit: 20 });
  });

  it('offers a retry when loading fails', async () => {
    await setup();
    service.getReport.mockReturnValue(throwError(() => new Error('offline')));
    const component = fixture.componentInstance as unknown as {
      load(): void;
      nextPage(): void;
    };
    component.load();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Không thể tải báo cáo chất lượng dữ liệu',
    );
    component.nextPage();
    const callsBeforeRetry = service.getReport.mock.calls.length;
    fixture.nativeElement.querySelector('.state-panel button').click();
    expect(service.getReport).toHaveBeenCalledTimes(callsBeforeRetry + 1);
  });
});
