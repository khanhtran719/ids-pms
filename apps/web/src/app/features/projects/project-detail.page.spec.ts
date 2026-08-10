import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import type {
  ProjectDetail,
  ProjectMember,
  ProjectMemberCandidate,
  TaskListResponse,
} from '@project-ql/api-contracts';
import { of, Subject, throwError } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { ProjectsService } from '../../core/projects.service';
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

  async function createFixture(
    overrides: Partial<Record<keyof ProjectsService, jest.Mock>> = {},
    canManage = true,
  ): Promise<{
    fixture: ComponentFixture<ProjectDetailPage>;
    projects: Record<keyof ProjectsService, jest.Mock>;
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
          ? ['projects.read', 'projects.manage']
          : ['projects.read'],
      },
    });
    const fixture = TestBed.createComponent(ProjectDetailPage);
    fixture.detectChanges();
    return { fixture, projects };
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
  });

  it('shows the five-step project progress without per-task requests', async () => {
    const { fixture } = await createFixture();

    expect(fixture.nativeElement.textContent).toContain('Tiến độ 5 bước');
    expect(fixture.nativeElement.textContent).toContain(
      'Hồ sơ thiết kế phê duyệt',
    );
    expect(fixture.nativeElement.textContent).toContain('Hoàn thành');
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
    expect(fixture.nativeElement.textContent).toContain('member');
  });
});
