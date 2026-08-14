import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type {
  AuthUser,
  RevenueReportResponse,
} from '@project-ql/api-contracts';
import { of, throwError } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { ProjectsService } from '../../core/projects.service';
import { RevenueService } from '../../core/revenue.service';
import { RevenueActualEditorComponent } from './revenue-actual-editor.component';
import { RevenuePage } from './revenue.page';

const RESPONSE: RevenueReportResponse = {
  fiscalYear: 2025,
  data: [
    {
      projectId: 'project-1',
      projectCode: 'IDS-01',
      projectName: 'IDS Riverside',
      quarters: [
        { quarter: 1, revenue: 120, cost: 80, grossProfit: 40 },
        { quarter: 2, revenue: 150, cost: 90, grossProfit: 60 },
        { quarter: 3, revenue: 100, cost: 70, grossProfit: 30 },
        { quarter: 4, revenue: 300, cost: 120, grossProfit: 180 },
      ],
      revenueTotal: 670,
      costTotal: 360,
      grossProfit: 310,
      grossMargin: 310 / 670,
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
  overview: {
    totalRevenue: 670,
    totalCost: 360,
    grossProfit: 310,
    grossMargin: 310 / 670,
    totalProjects: 4,
    projectsWithRevenue: 1,
    projectsWithoutRevenue: 3,
  },
  quarters: [
    { quarter: 1, revenue: 120, cost: 80, grossProfit: 40 },
    { quarter: 2, revenue: 150, cost: 90, grossProfit: 60 },
    { quarter: 3, revenue: 100, cost: 70, grossProfit: 30 },
    { quarter: 4, revenue: 300, cost: 120, grossProfit: 180 },
  ],
};

describe('RevenuePage', () => {
  let fixture: ComponentFixture<RevenuePage>;
  let revenue: { list: jest.Mock; upsert: jest.Mock };

  async function setup(canManage = true) {
    revenue = {
      list: jest.fn().mockReturnValue(of(RESPONSE)),
      upsert: jest.fn().mockReturnValue(of({})),
    };
    await TestBed.configureTestingModule({
      imports: [RevenuePage],
      providers: [
        provideRouter([]),
        { provide: RevenueService, useValue: revenue },
        {
          provide: ProjectsService,
          useValue: {
            list: jest.fn().mockReturnValue(
              of({
                data: [
                  { id: 'project-1', code: 'IDS-01', name: 'IDS Riverside' },
                ],
                meta: {},
              }),
            ),
          },
        },
      ],
    }).compileComponents();
    TestBed.inject(AuthSessionStore).setSession({
      accessToken: 'token',
      expiresInSeconds: 900,
      user: {
        id: 'user-1',
        email: 'manager@example.com',
        displayName: 'Manager',
        status: 'active',
        roleCodes: ['manager'],
        permissions: [
          'projects.read',
          'revenue.read',
          ...(canManage ? (['revenue.manage'] as const) : []),
        ],
      } satisfies AuthUser,
    });
    fixture = TestBed.createComponent(RevenuePage);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders fiscal KPIs, quarterly comparison and project results', async () => {
    await setup();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Doanh thu');
    expect(text).toContain('FY2025');
    expect(text).toContain('IDS Riverside');
    expect(text).toContain('3/4');
    expect(text).toContain('Đối soát phân bổ cuối năm');
  });

  it('reloads immediately for fiscal year and debounces project search', async () => {
    jest.useFakeTimers();
    await setup();
    const page = fixture.componentInstance as unknown as {
      fiscalYearControl: { setValue(value: number): void };
      searchControl: { setValue(value: string): void };
    };

    page.fiscalYearControl.setValue(2024);
    expect(revenue.list).toHaveBeenLastCalledWith({
      fiscalYear: 2024,
      page: 1,
      limit: 20,
    });

    page.searchControl.setValue('Riverside');
    jest.advanceTimersByTime(299);
    expect(revenue.list).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(1);
    expect(revenue.list).toHaveBeenLastCalledWith({
      fiscalYear: 2024,
      page: 1,
      limit: 20,
      search: 'Riverside',
    });
    jest.useRealTimers();
  });

  it('lets managers upsert a quarter and keeps write actions hidden for readers', async () => {
    await setup(true);
    fixture.nativeElement.querySelector('.add-button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ghi nhận số thực tế');
    const editor = fixture.debugElement.query(
      By.directive(RevenueActualEditorComponent),
    ).componentInstance as unknown as {
      form: {
        setValue(value: {
          projectId: string;
          quarter: 1;
          revenue: number;
          cost: number;
        }): void;
      };
      submit(): void;
    };
    editor.form.setValue({
      projectId: 'project-1',
      quarter: 1,
      revenue: 120,
      cost: 80,
    });
    editor.submit();
    expect(revenue.upsert).toHaveBeenCalledWith({
      projectId: 'project-1',
      fiscalYear: 2025,
      quarter: 1,
      revenue: 120,
      cost: 80,
    });

    TestBed.resetTestingModule();
    await setup(false);
    expect(fixture.nativeElement.querySelector('.add-button')).toBeNull();
  });

  it('shows meaningful empty and retry states', async () => {
    await setup();
    revenue.list.mockReturnValue(
      of({
        ...RESPONSE,
        data: [],
        meta: { ...RESPONSE.meta, totalItems: 0, totalPages: 0 },
        overview: {
          ...RESPONSE.overview,
          projectsWithRevenue: 0,
          projectsWithoutRevenue: 4,
        },
      }),
    );
    const page = fixture.componentInstance as unknown as { load(): void };
    page.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Chưa có số liệu doanh thu',
    );

    revenue.list.mockReturnValue(throwError(() => new Error('offline')));
    page.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Không thể tải báo cáo doanh thu',
    );
  });
});
