import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type {
  PaginatedResponse,
  ProjectDetail,
} from '@project-ql/api-contracts';
import { Subject } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { ProjectsService } from '../../core/projects.service';
import { ProjectsPage } from './projects.page';

describe('ProjectsPage', () => {
  let response: Subject<PaginatedResponse<ProjectDetail>>;
  let createResponse: Subject<ProjectDetail>;
  let projects: { list: jest.Mock; create: jest.Mock };

  const emptyPage: PaginatedResponse<ProjectDetail> = {
    data: [],
    meta: {
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  const project: ProjectDetail = {
    id: 'project-1',
    code: 'IDS',
    name: 'IDS PMS',
    status: 'planning',
    operationalStatus: 'operational',
    investor: 'IDS Corporation',
    province: 'Hồ Chí Minh',
    unitCount: 420,
    floorAreaM2: 62_500,
    carrierContractCount: 3,
    revenueTotal: 5_100_000_000,
    dataConflict: true,
    memberCount: 1,
    myRole: 'owner',
    createdBy: 'admin-1',
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
  };

  beforeEach(async () => {
    response = new Subject<PaginatedResponse<ProjectDetail>>();
    createResponse = new Subject<ProjectDetail>();
    projects = {
      list: jest.fn(() => response),
      create: jest.fn(() => createResponse),
    };
    await TestBed.configureTestingModule({
      imports: [ProjectsPage],
      providers: [
        provideRouter([]),
        {
          provide: ProjectsService,
          useValue: projects,
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
        permissions: ['projects.read', 'projects.manage'],
      },
    });
  });

  it('renders loading and a useful empty state', () => {
    const fixture = TestBed.createComponent(ProjectsPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Đang tải danh sách dự án',
    );

    response.next(emptyPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Chưa có dự án');
    expect(
      fixture.nativeElement.querySelector('button')?.textContent,
    ).toContain('Tạo dự án');
  });

  it('applies the IDS filters and retries a failed list request', () => {
    const fixture = TestBed.createComponent(ProjectsPage);
    response.next(emptyPage);
    fixture.detectChanges();

    const filter = fixture.nativeElement.querySelector(
      '#operationalStatusFilter',
    ) as HTMLSelectElement;
    filter.value = 'operational';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(projects.list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
        operationalStatus: 'operational',
      }),
    );

    const qualityFilter = fixture.nativeElement.querySelector(
      '#dataQualityFilter',
    ) as HTMLSelectElement;
    qualityFilter.value = 'conflict';
    qualityFilter.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(projects.list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        operationalStatus: 'operational',
        dataQuality: 'conflict',
      }),
    );

    const retryResponse = new Subject<PaginatedResponse<ProjectDetail>>();
    projects.list.mockReturnValue(retryResponse);
    response.error(new Error('network'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Không thể tải danh sách dự án',
    );
    fixture.nativeElement.querySelector('.state-panel button').click();
    retryResponse.next({ ...emptyPage, data: [project] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('IDS PMS');
    expect(fixture.nativeElement.textContent).toContain('IDS Corporation');
    expect(fixture.nativeElement.textContent).toContain('Hồ Chí Minh');
    expect(fixture.nativeElement.textContent).toContain('5,10 tỷ');
  });

  it('debounces project search and sends the normalized term', () => {
    jest.useFakeTimers();
    const fixture = TestBed.createComponent(ProjectsPage);
    response.next(emptyPage);
    fixture.detectChanges();

    const search = fixture.nativeElement.querySelector(
      '#projectSearch',
    ) as HTMLInputElement;
    search.value = '  Nam Long  ';
    search.dispatchEvent(new Event('input'));
    jest.advanceTimersByTime(300);

    expect(projects.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Nam Long' }),
    );
    jest.useRealTimers();
  });

  it('validates, creates and navigates to a project with optional fields', () => {
    const fixture = TestBed.createComponent(ProjectsPage);
    const navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    response.next(emptyPage);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('header button').click();
    fixture.detectChanges();

    const submit = fixture.nativeElement.querySelector(
      '.create-panel button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    const values: Array<[string, string]> = [
      ['#projectCode', 'IDS'],
      ['#projectName', 'IDS PMS'],
      ['#projectDescription', 'Project management'],
      ['#projectStartDate', '2026-08-10'],
      ['#projectDueDate', '2026-09-10'],
    ];
    for (const [selector, value] of values) {
      const input = fixture.nativeElement.querySelector(
        selector,
      ) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
    submit.click();

    expect(projects.create).toHaveBeenCalledWith({
      code: 'IDS',
      name: 'IDS PMS',
      description: 'Project management',
      status: 'planning',
      operationalStatus: 'not_started',
      startDate: '2026-08-10',
      dueDate: '2026-09-10',
    });
    createResponse.next(project);
    createResponse.complete();
    expect(navigate).toHaveBeenCalledWith(['/projects', 'project-1']);
  });

  it('shows a controlled creation error for the minimal valid form', () => {
    const fixture = TestBed.createComponent(ProjectsPage);
    response.next(emptyPage);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('header button').click();
    fixture.detectChanges();

    for (const [selector, value] of [
      ['#projectCode', 'IDS'],
      ['#projectName', 'IDS PMS'],
    ]) {
      const input = fixture.nativeElement.querySelector(
        selector,
      ) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('.create-panel button[type="submit"]')
      .click();
    createResponse.error(new Error('duplicate internals'));
    fixture.detectChanges();

    expect(projects.create).toHaveBeenCalledWith({
      code: 'IDS',
      name: 'IDS PMS',
      status: 'planning',
      operationalStatus: 'not_started',
    });
    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain('Không thể tạo dự án');
    expect(fixture.nativeElement.textContent).not.toContain(
      'duplicate internals',
    );
  });
});
