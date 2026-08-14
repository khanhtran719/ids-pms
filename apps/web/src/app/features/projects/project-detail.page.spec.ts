import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import type {
  CarrierContractListResponse,
  ProjectDetail,
  ProjectMember,
  ProjectMemberCandidate,
  RevenueActual,
  RevenueReportResponse,
  TaskListResponse,
} from '@project-ql/api-contracts';
import { of, Subject, throwError } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { CarrierContractsService } from '../../core/carrier-contracts.service';
import { ProjectActivitiesService } from '../../core/project-activities.service';
import { ProjectsService } from '../../core/projects.service';
import { RevenueService } from '../../core/revenue.service';
import { TasksService } from '../../core/tasks.service';
import { ProjectDetailPage } from './project-detail.page';

describe('ProjectDetailPage', () => {
  const project: ProjectDetail = {
    id: 'project-1',
    code: 'IDS',
    name: 'IDS PMS',
    description: 'Project management',
    status: 'active',
    operationalStatus: 'operational',
    investor: 'IDS Corporation',
    province: 'Hồ Chí Minh',
    projectType: 'Chung cư kết hợp thương mại',
    scaleDescription: '2 block, 25 tầng',
    unitCount: 420,
    floorAreaM2: 62_500,
    capex: 4_200_000_000,
    revenueTotal: 5_100_000_000,
    costTotal: 2_700_000_000,
    dataSources: ['Teldata', 'DoanhThu'],
    dataConflict: true,
    memberCount: 1,
    myRole: 'owner',
    createdBy: 'admin-1',
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
  };
  const owner: ProjectMember = {
    userId: 'admin-1',
    email: 'admin@example.com',
    displayName: 'Administrator',
    status: 'active',
    role: 'owner',
    joinedAt: '2026-08-10T00:00:00.000Z',
  };
  const candidate: ProjectMemberCandidate = {
    userId: 'member-1',
    email: 'member@example.com',
    displayName: 'Member',
  };
  const taskResponse: TaskListResponse = {
    data: [
      {
        id: 'task-1',
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        step: 1,
        name: 'Hồ sơ thiết kế phê duyệt',
        department: 'P.KTDA',
        status: 'done',
        actualEndDate: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
    ],
    overview: {
      totalTasks: 1,
      completedTasks: 1,
      tasksWithActualEnd: 1,
      trackedProjects: 1,
    },
    meta: {
      page: 1,
      limit: 5,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
  const carrierResponse: CarrierContractListResponse = {
    data: [
      {
        id: 'contract-1',
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        carrier: 'Viettel',
        serviceType: 'teldata',
        quantity: 210,
        unit: 'apartment',
        unitPrice: 50_000,
        paymentCycle: 'monthly',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T00:00:00.000Z',
        termsComplete: true,
        penetrationRate: 0.5,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-08-14T00:00:00.000Z',
      },
    ],
    overview: {
      totalContracts: 1,
      teldataContracts: 1,
      ibsContracts: 0,
      contractsWithTerms: 1,
      coveredProjects: 1,
    },
    availableCarriers: ['Viettel'],
    meta: {
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
  const revenueResponse: RevenueReportResponse = {
    data: [
      {
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        quarters: [
          {
            quarter: 1,
            revenue: 120_000_000,
            cost: 80_000_000,
            grossProfit: 40_000_000,
          },
          { quarter: 2, revenue: 0, cost: 0, grossProfit: 0 },
          { quarter: 3, revenue: 0, cost: 0, grossProfit: 0 },
          { quarter: 4, revenue: 0, cost: 0, grossProfit: 0 },
        ],
        revenueTotal: 120_000_000,
        costTotal: 80_000_000,
        grossProfit: 40_000_000,
        grossMargin: 1 / 3,
      },
    ],
    fiscalYear: 2025,
    overview: {
      totalRevenue: 120_000_000,
      totalCost: 80_000_000,
      grossProfit: 40_000_000,
      grossMargin: 1 / 3,
      totalProjects: 1,
      projectsWithRevenue: 1,
      projectsWithoutRevenue: 0,
    },
    quarters: [
      {
        quarter: 1,
        revenue: 120_000_000,
        cost: 80_000_000,
        grossProfit: 40_000_000,
      },
      { quarter: 2, revenue: 0, cost: 0, grossProfit: 0 },
      { quarter: 3, revenue: 0, cost: 0, grossProfit: 0 },
      { quarter: 4, revenue: 0, cost: 0, grossProfit: 0 },
    ],
    meta: {
      page: 1,
      limit: 1,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  async function createFixture(
    overrides: Partial<Record<keyof ProjectsService, jest.Mock>> = {},
    canManage = true,
    contractList: jest.Mock = jest.fn(() => of(carrierResponse)),
    revenueList: jest.Mock = jest.fn(() => of(revenueResponse)),
    revenueUpsert: jest.Mock = jest.fn(() =>
      of({
        id: 'actual-1',
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        fiscalYear: 2025,
        quarter: 1,
        revenue: 120_000_000,
        cost: 80_000_000,
        grossProfit: 40_000_000,
        createdAt: '2026-08-14T00:00:00.000Z',
        updatedAt: '2026-08-14T00:00:00.000Z',
      } satisfies RevenueActual),
    ),
  ): Promise<{
    fixture: ComponentFixture<ProjectDetailPage>;
    projects: Record<keyof ProjectsService, jest.Mock>;
    carrierContracts: { list: jest.Mock };
    revenue: { list: jest.Mock; upsert: jest.Mock };
  }> {
    const projects = {
      list: jest.fn(),
      create: jest.fn(),
      getById: jest.fn(() => of(project)),
      update: jest.fn(() => of(project)),
      listMembers: jest.fn(() => of([owner])),
      listMemberCandidates: jest.fn(() => of([candidate])),
      upsertMember: jest.fn(),
      removeMember: jest.fn(),
      ...overrides,
    } as Record<keyof ProjectsService, jest.Mock>;
    const carrierContracts = {
      list: contractList,
    };
    const revenue = { list: revenueList, upsert: revenueUpsert };
    await TestBed.configureTestingModule({
      imports: [ProjectDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ projectId: 'project-1' }),
            },
          },
        },
        { provide: ProjectsService, useValue: projects },
        {
          provide: TasksService,
          useValue: { list: jest.fn(() => of(taskResponse)) },
        },
        { provide: CarrierContractsService, useValue: carrierContracts },
        {
          provide: ProjectActivitiesService,
          useValue: {
            list: jest.fn(() =>
              of({
                data: [],
                meta: {
                  page: 1,
                  limit: 20,
                  totalItems: 0,
                  totalPages: 0,
                  hasNextPage: false,
                  hasPreviousPage: false,
                },
              }),
            ),
            createComment: jest.fn(),
          },
        },
        { provide: RevenueService, useValue: revenue },
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
        roleCodes: [canManage ? 'admin' : 'member'],
        permissions: canManage
          ? [
              'projects.read',
              'projects.manage',
              'carrier-contracts.read',
              'carrier-contracts.manage',
              'revenue.read',
              'revenue.manage',
            ]
          : ['projects.read', 'carrier-contracts.read', 'revenue.read'],
      },
    });
    const fixture = TestBed.createComponent(ProjectDetailPage);
    fixture.detectChanges();
    return { fixture, projects, carrierContracts, revenue };
  }

  it('loads project, members and progress together before rendering the workspace', async () => {
    const projectResponse = new Subject<ProjectDetail>();
    const membersResponse = new Subject<ProjectMember[]>();
    await TestBed.configureTestingModule({
      imports: [ProjectDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ projectId: 'project-1' }),
            },
          },
        },
        {
          provide: ProjectsService,
          useValue: {
            getById: jest.fn(() => projectResponse),
            listMembers: jest.fn(() => membersResponse),
          },
        },
        {
          provide: TasksService,
          useValue: { list: jest.fn(() => of(taskResponse)) },
        },
        {
          provide: CarrierContractsService,
          useValue: { list: jest.fn(() => of(carrierResponse)) },
        },
        {
          provide: ProjectActivitiesService,
          useValue: {
            list: jest.fn(() =>
              of({
                data: [],
                meta: {
                  page: 1,
                  limit: 20,
                  totalItems: 0,
                  totalPages: 0,
                  hasNextPage: false,
                  hasPreviousPage: false,
                },
              }),
            ),
            createComment: jest.fn(),
          },
        },
        {
          provide: RevenueService,
          useValue: {
            list: jest.fn(() => of(revenueResponse)),
            upsert: jest.fn(),
          },
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
    const fixture = TestBed.createComponent(ProjectDetailPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Đang tải dự án');

    projectResponse.next({
      id: 'project-1',
      code: 'IDS',
      name: 'IDS PMS',
      status: 'active',
      memberCount: 1,
      myRole: 'owner',
      createdBy: 'admin-1',
      createdAt: '2026-08-10T00:00:00.000Z',
      updatedAt: '2026-08-10T00:00:00.000Z',
    });
    membersResponse.next([
      {
        userId: 'admin-1',
        email: 'admin@example.com',
        displayName: 'Administrator',
        status: 'active',
        role: 'owner',
        joinedAt: '2026-08-10T00:00:00.000Z',
      },
    ]);
    projectResponse.complete();
    membersResponse.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('IDS PMS');
    expect(fixture.nativeElement.textContent).toContain('Administrator');
  });

  it('renders the IDS project profile, data warning and financial summary', async () => {
    const { fixture } = await createFixture();

    expect(fixture.nativeElement.textContent).toContain('IDS Corporation');
    expect(fixture.nativeElement.textContent).toContain('Hồ Chí Minh');
    expect(fixture.nativeElement.textContent).toContain('2 block, 25 tầng');
    expect(fixture.nativeElement.textContent).toContain('5,10 tỷ');
    expect(fixture.nativeElement.textContent).toContain('4,20 tỷ');
    expect(fixture.nativeElement.textContent).toContain('dữ liệu xung đột');
    expect(fixture.nativeElement.textContent).toContain('Teldata');
    expect(fixture.nativeElement.textContent).toContain('Hoạt động dự án');
  });

  it('shows the five-step project progress without per-task requests', async () => {
    const { fixture } = await createFixture();

    expect(fixture.nativeElement.textContent).toContain('Tiến độ 5 bước');
    expect(fixture.nativeElement.textContent).toContain(
      'Hồ sơ thiết kế phê duyệt',
    );
    expect(fixture.nativeElement.textContent).toContain('Hoàn thành');
  });

  it('shows project carrier contracts, penetration and a scoped management link', async () => {
    const { fixture, carrierContracts } = await createFixture();

    expect(carrierContracts.list).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      projectId: 'project-1',
    });
    expect(fixture.nativeElement.textContent).toContain(
      'Hợp đồng khai thác nhà mạng (1)',
    );
    expect(fixture.nativeElement.textContent).toContain('Viettel');
    expect(fixture.nativeElement.textContent).toContain('50%');
    expect(fixture.nativeElement.textContent).toContain('Đủ điều khoản');
    expect(
      fixture.nativeElement.querySelector(
        'a[href="/carrier-contracts?projectId=project-1"]',
      ),
    ).not.toBeNull();
  });

  it('loads and renders the exact project revenue across four quarters', async () => {
    const { fixture, revenue } = await createFixture();

    expect(revenue.list).toHaveBeenCalledWith({
      fiscalYear: 2025,
      page: 1,
      limit: 1,
      projectId: 'project-1',
    });
    expect(fixture.nativeElement.textContent).toContain('Doanh thu theo quý');
    expect(fixture.nativeElement.textContent).toContain('FY2025');
    expect(fixture.nativeElement.textContent).toContain('Q1');
    expect(fixture.nativeElement.textContent).toContain('120,000,000');
    expect(fixture.nativeElement.textContent).toContain('33.3%');
  });

  it('updates one project quarter and refreshes only the revenue card', async () => {
    const updatedResponse: RevenueReportResponse = {
      ...revenueResponse,
      data: [
        {
          ...revenueResponse.data[0],
          quarters: revenueResponse.data[0].quarters.map((quarter) =>
            quarter.quarter === 1
              ? {
                  quarter: 1,
                  revenue: 150_000_000,
                  cost: 90_000_000,
                  grossProfit: 60_000_000,
                }
              : quarter,
          ),
          revenueTotal: 150_000_000,
          costTotal: 90_000_000,
          grossProfit: 60_000_000,
          grossMargin: 0.4,
        },
      ],
    };
    const revenueList = jest
      .fn()
      .mockReturnValueOnce(of(revenueResponse))
      .mockReturnValueOnce(of(updatedResponse));
    const revenueUpsert = jest.fn(() =>
      of({
        id: 'actual-1',
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        fiscalYear: 2025,
        quarter: 1 as const,
        revenue: 150_000_000,
        cost: 90_000_000,
        grossProfit: 60_000_000,
        createdAt: '2026-08-14T00:00:00.000Z',
        updatedAt: '2026-08-14T01:00:00.000Z',
      }),
    );
    const { fixture, projects } = await createFixture(
      {},
      true,
      jest.fn(() => of(carrierResponse)),
      revenueList,
      revenueUpsert,
    );
    const projectLoadsBeforeSave = projects.getById.mock.calls.length;

    fixture.nativeElement
      .querySelector('button[aria-label="Chỉnh sửa doanh thu quý 1"]')
      .click();
    fixture.detectChanges();
    const revenueInput = fixture.nativeElement.querySelector(
      '#revenueValue',
    ) as HTMLInputElement;
    const costInput = fixture.nativeElement.querySelector(
      '#costValue',
    ) as HTMLInputElement;
    revenueInput.value = '150000000';
    revenueInput.dispatchEvent(new Event('input'));
    costInput.value = '90000000';
    costInput.dispatchEvent(new Event('input'));
    fixture.nativeElement
      .querySelector('.editor button[type="submit"]')
      .click();
    fixture.detectChanges();

    expect(revenueUpsert).toHaveBeenCalledWith({
      projectId: 'project-1',
      fiscalYear: 2025,
      quarter: 1,
      revenue: 150_000_000,
      cost: 90_000_000,
    });
    expect(revenueList).toHaveBeenCalledTimes(2);
    expect(projects.getById).toHaveBeenCalledTimes(projectLoadsBeforeSave);
    expect(fixture.nativeElement.textContent).toContain('150,000,000');
    expect(fixture.nativeElement.querySelector('.editor')).toBeNull();
  });

  it('keeps project detail usable when revenue cannot be loaded and retries only that card', async () => {
    const revenueList = jest
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('revenue offline')))
      .mockReturnValueOnce(of(revenueResponse));
    const { fixture, projects } = await createFixture(
      {},
      true,
      jest.fn(() => of(carrierResponse)),
      revenueList,
    );
    const projectLoadsBeforeRetry = projects.getById.mock.calls.length;

    expect(fixture.nativeElement.textContent).toContain('IDS PMS');
    expect(fixture.nativeElement.textContent).toContain(
      'Không thể tải doanh thu của dự án',
    );
    fixture.nativeElement.querySelector('.revenue-state button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('120,000,000');
    expect(revenueList).toHaveBeenCalledTimes(2);
    expect(projects.getById).toHaveBeenCalledTimes(projectLoadsBeforeRetry);
  });

  it('switches fiscal year and closes a stale quarter editor', async () => {
    const { fixture, revenue } = await createFixture();
    fixture.nativeElement
      .querySelector('button[aria-label="Chỉnh sửa doanh thu quý 1"]')
      .click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.editor')).toBeTruthy();

    const year = fixture.nativeElement.querySelector(
      '#projectRevenueYear',
    ) as HTMLSelectElement;
    year.value = '2026';
    year.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(revenue.list).toHaveBeenLastCalledWith({
      fiscalYear: 2026,
      page: 1,
      limit: 1,
      projectId: 'project-1',
    });
    expect(fixture.nativeElement.querySelector('.editor')).toBeNull();
  });

  it('keeps the quarter editor open with a controlled save error', async () => {
    const revenueUpsert = jest.fn(() =>
      throwError(() => new Error('write unavailable')),
    );
    const { fixture } = await createFixture(
      {},
      true,
      jest.fn(() => of(carrierResponse)),
      jest.fn(() => of(revenueResponse)),
      revenueUpsert,
    );

    fixture.nativeElement
      .querySelector('button[aria-label="Chỉnh sửa doanh thu quý 1"]')
      .click();
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('.editor button[type="submit"]')
      .click();
    fixture.detectChanges();

    expect(revenueUpsert).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.editor')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(
      'Không thể lưu doanh thu',
    );
  });

  it('keeps project detail usable when carrier contracts cannot be loaded', async () => {
    const contractList = jest
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('contracts offline')))
      .mockReturnValue(of(carrierResponse));
    const { fixture } = await createFixture({}, true, contractList);

    expect(fixture.nativeElement.textContent).toContain('IDS PMS');
    expect(fixture.nativeElement.textContent).toContain(
      'Không thể tải hợp đồng của dự án',
    );
    fixture.nativeElement.querySelector('.contracts-state button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Viettel');
    expect(contractList).toHaveBeenCalledTimes(2);
  });

  it('renders a safe load error and retries both bounded requests', async () => {
    const getById = jest
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('not found')))
      .mockReturnValue(of(project));
    const listMembers = jest.fn(() => of([owner]));
    const { fixture } = await createFixture({ getById, listMembers });

    expect(fixture.nativeElement.textContent).toContain('Không thể tải dự án');
    fixture.nativeElement.querySelector('.state-panel button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('IDS PMS');
    expect(getById).toHaveBeenCalledTimes(2);
    expect(listMembers).toHaveBeenCalledTimes(2);
  });

  it('updates project fields and closes the editor after success', async () => {
    const updated = {
      ...project,
      name: 'IDS PMS Updated',
      status: 'completed' as const,
    };
    const update = jest.fn(() => of(updated));
    const { fixture } = await createFixture({
      update,
      getById: jest.fn(() =>
        of({
          ...project,
          startDate: '2026-08-10T00:00:00.000Z',
          dueDate: '2026-09-10T00:00:00.000Z',
        }),
      ),
    });

    fixture.nativeElement.querySelector('.project-header button').click();
    fixture.detectChanges();
    const name = fixture.nativeElement.querySelector(
      '#editName',
    ) as HTMLInputElement;
    name.value = 'IDS PMS Updated';
    name.dispatchEvent(new Event('input'));
    const status = fixture.nativeElement.querySelector(
      '#editStatus',
    ) as HTMLSelectElement;
    status.value = 'completed';
    status.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('.edit-panel button[type="submit"]')
      .click();
    fixture.detectChanges();

    expect(update).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({
        name: 'IDS PMS Updated',
        status: 'completed',
        startDate: '2026-08-10',
        dueDate: '2026-09-10',
      }),
    );
    expect(fixture.nativeElement.textContent).toContain('IDS PMS Updated');
    expect(fixture.nativeElement.querySelector('.edit-panel')).toBeNull();
  });

  it('keeps the project editor open and shows a controlled update error', async () => {
    const update = jest.fn(() => throwError(() => new Error('database')));
    const { fixture } = await createFixture({ update });

    fixture.nativeElement.querySelector('.project-header button').click();
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('.edit-panel button[type="submit"]')
      .click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.edit-panel')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain('Không thể cập nhật dự án');
  });

  it('loads candidates lazily and adds a new project member', async () => {
    const added: ProjectMember = {
      ...owner,
      userId: candidate.userId,
      email: candidate.email,
      displayName: candidate.displayName,
      role: 'member',
    };
    const upsertMember = jest.fn(() => of(added));
    const { fixture, projects } = await createFixture({ upsertMember });

    expect(projects.listMemberCandidates).not.toHaveBeenCalled();
    const addButton = Array.from(
      fixture.nativeElement.querySelectorAll(
        '.card-heading button',
      ) as NodeListOf<HTMLButtonElement>,
    )[0];
    addButton.click();
    fixture.detectChanges();
    expect(projects.listMemberCandidates).toHaveBeenCalledWith(
      'project-1',
      undefined,
      30,
    );

    const userSelect = fixture.nativeElement.querySelector(
      '#candidateUser',
    ) as HTMLSelectElement;
    userSelect.value = candidate.userId;
    userSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('.member-form button[type="submit"]')
      .click();
    fixture.detectChanges();

    expect(upsertMember).toHaveBeenCalledWith('project-1', {
      userId: candidate.userId,
      role: 'member',
    });
    expect(fixture.nativeElement.textContent).toContain(candidate.email);
    expect(fixture.nativeElement.querySelector('.member-form')).toBeNull();
  });

  it('reports candidate-directory failures and does not reload while closing', async () => {
    const listMemberCandidates = jest.fn(() =>
      throwError(() => new Error('directory unavailable')),
    );
    const { fixture } = await createFixture({ listMemberCandidates });
    const toggle = fixture.nativeElement.querySelector(
      '.card-heading button',
    ) as HTMLButtonElement;

    toggle.click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain('Không thể tải danh sách người dùng');
    toggle.click();
    fixture.detectChanges();
    expect(listMemberCandidates).toHaveBeenCalledTimes(1);
  });

  it('updates a member role and restores it when a later update fails', async () => {
    const manager = { ...owner, role: 'manager' as const };
    const upsertMember = jest
      .fn()
      .mockReturnValueOnce(of(manager))
      .mockReturnValueOnce(throwError(() => new Error('last owner')));
    const { fixture } = await createFixture({ upsertMember });
    const roleSelect = fixture.nativeElement.querySelector(
      '.role-select',
    ) as HTMLSelectElement;

    roleSelect.value = 'manager';
    roleSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(upsertMember).toHaveBeenCalledWith('project-1', {
      userId: owner.userId,
      role: 'manager',
    });

    roleSelect.value = 'member';
    roleSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(roleSelect.value).toBe('manager');
    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain('Không thể đổi vai trò');
  });

  it('removes a member after confirmation and handles final-owner errors', async () => {
    const member: ProjectMember = {
      ...owner,
      userId: 'member-1',
      email: 'member@example.com',
      displayName: 'Member',
      role: 'member',
    };
    const removeMember = jest
      .fn()
      .mockReturnValueOnce(of(undefined))
      .mockReturnValueOnce(throwError(() => new Error('last owner')));
    const { fixture } = await createFixture({
      listMembers: jest.fn(() => of([owner, member])),
      getById: jest.fn(() => of({ ...project, memberCount: 2 })),
      removeMember,
    });

    fixture.nativeElement
      .querySelector('button[aria-label="Xóa Member khỏi dự án"]')
      .click();
    fixture.detectChanges();
    const confirmations = fixture.nativeElement.querySelectorAll(
      '.confirm-actions button:first-child',
    ) as NodeListOf<HTMLButtonElement>;
    confirmations[0].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain(
      'member@example.com',
    );

    fixture.nativeElement
      .querySelector('button[aria-label="Xóa Administrator khỏi dự án"]')
      .click();
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('.confirm-actions button:first-child')
      .click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain('Không thể xóa owner cuối cùng');
  });

  it('renders membership controls for an owner without a global manage permission', async () => {
    const { fixture } = await createFixture({}, false);

    expect(
      fixture.nativeElement.querySelector('.project-header button'),
    ).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.role-select')).toBeTruthy();
  });

  it('hides management controls from a regular project member', async () => {
    const { fixture } = await createFixture(
      {
        getById: jest.fn(() => of({ ...project, myRole: 'member' })),
      },
      false,
    );

    expect(
      fixture.nativeElement.querySelector('.project-header button'),
    ).toBeNull();
    expect(fixture.nativeElement.querySelector('.role-select')).toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        'button[aria-label="Chỉnh sửa doanh thu quý 1"]',
      ),
    ).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('member');
  });
});
