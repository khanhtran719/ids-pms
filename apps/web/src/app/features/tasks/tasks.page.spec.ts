import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  AuthUser,
  ProjectDetail,
  ProjectTask,
  TaskListResponse,
} from '@project-ql/api-contracts';
import { of, throwError } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { ProjectsService } from '../../core/projects.service';
import { TasksService } from '../../core/tasks.service';
import { TasksPage } from './tasks.page';

const TASKS: ProjectTask[] = [
  {
    id: 'task-1',
    projectId: 'project-1',
    projectCode: 'IDS',
    projectName: 'IDS PMS',
    step: 1,
    name: 'Hồ sơ thiết kế phê duyệt',
    department: 'P.KTDA',
    plannedStartDate: '2026-08-10T00:00:00.000Z',
    plannedEndDate: '2026-08-20T00:00:00.000Z',
    status: 'in_progress',
    updatedAt: '2026-08-10T00:00:00.000Z',
  },
  {
    id: 'task-2',
    projectId: 'project-1',
    projectCode: 'IDS',
    projectName: 'IDS PMS',
    step: 2,
    name: 'Chuẩn bị vật tư, pháp lý, mặt bằng',
    department: 'P.KTDA',
    status: 'todo',
    updatedAt: '2026-08-10T00:00:00.000Z',
  },
];

const RESPONSE: TaskListResponse = {
  data: TASKS,
  meta: {
    page: 1,
    limit: 50,
    totalItems: 2,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
  overview: {
    totalTasks: 2,
    completedTasks: 0,
    tasksWithActualEnd: 0,
    trackedProjects: 1,
  },
};

const PROJECT: ProjectDetail = {
  id: 'project-1',
  code: 'IDS',
  name: 'IDS PMS',
  status: 'active',
  memberCount: 2,
  createdBy: 'user-1',
  createdAt: '2026-08-10T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
};

describe('TasksPage', () => {
  let fixture: ComponentFixture<TasksPage>;
  let tasks: { list: jest.Mock; initializePlan: jest.Mock; update: jest.Mock };
  let projects: { list: jest.Mock };

  async function setup(canManage = true) {
    tasks = {
      list: jest.fn().mockReturnValue(of(RESPONSE)),
      initializePlan: jest.fn().mockReturnValue(of(TASKS)),
      update: jest.fn().mockReturnValue(of(TASKS[0])),
    };
    projects = {
      list: jest.fn().mockReturnValue(
        of({
          data: [PROJECT],
          meta: RESPONSE.meta,
        }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [TasksPage],
      providers: [
        provideRouter([]),
        { provide: TasksService, useValue: tasks },
        { provide: ProjectsService, useValue: projects },
      ],
    }).compileComponents();
    const auth = TestBed.inject(AuthSessionStore);
    auth.setSession('token', {
      id: 'user-1',
      email: 'manager@example.com',
      displayName: 'Manager',
      status: 'active',
      roleCodes: ['manager'],
      permissions: canManage
        ? ['projects.read', 'projects.manage', 'tasks.read', 'tasks.manage']
        : ['projects.read', 'tasks.read'],
    } satisfies AuthUser);
    fixture = TestBed.createComponent(TasksPage);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders mockup overview and groups the task plan by project', async () => {
    await setup();

    expect(fixture.nativeElement.textContent).toContain('Tiến độ thi công');
    expect(fixture.nativeElement.textContent).toContain('IDS PMS');
    expect(fixture.nativeElement.textContent).toContain('0/2 hoàn thành');
    expect(fixture.nativeElement.textContent).toContain(
      'Hồ sơ thiết kế phê duyệt',
    );
    expect(tasks.list).toHaveBeenCalledWith(1, 50, undefined, undefined);
  });

  it('does not load management-only project choices for read-only members', async () => {
    await setup(false);

    expect(projects.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.initialize-panel')).toBeNull();
  });

  it('initializes the selected project plan then refreshes once', async () => {
    await setup();
    const component = fixture.componentInstance as unknown as {
      selectedProjectId: { set(value: string): void };
      initializePlan(): void;
    };
    component.selectedProjectId.set('project-1');
    component.initializePlan();

    expect(tasks.initializePlan).toHaveBeenCalledWith('project-1');
    expect(tasks.list).toHaveBeenCalledTimes(2);
  });

  it('reloads when the status filter changes', async () => {
    await setup();
    const component = fixture.componentInstance as unknown as {
      statusFilter: { setValue(value: string): void };
    };

    component.statusFilter.setValue('done');

    expect(tasks.list).toHaveBeenLastCalledWith(1, 50, undefined, 'done');
  });

  it('shows a recoverable initialize error', async () => {
    await setup();
    tasks.initializePlan.mockReturnValue(
      throwError(() => new Error('offline')),
    );
    const component = fixture.componentInstance as unknown as {
      selectedProjectId: { set(value: string): void };
      initializeError: { (): string | null };
      initializePlan(): void;
    };
    component.selectedProjectId.set('project-1');
    component.initializePlan();
    expect(component.initializeError()).toContain(
      'Không thể khởi tạo kế hoạch',
    );
  });

  it('requires the actual end date before sending a completed task', async () => {
    await setup();
    const component = fixture.componentInstance as unknown as {
      editTask(task: ProjectTask): void;
      editForm: { patchValue(value: object): void };
      saveTask(): void;
    };
    component.editTask(TASKS[0]);
    component.editForm.patchValue({ status: 'done', actualEndDate: '' });
    component.saveTask();

    expect(tasks.update).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Ngày hoàn thành thực tế là bắt buộc',
    );
  });

  it('normalizes the edit form and refreshes after a successful update', async () => {
    await setup();
    const component = fixture.componentInstance as unknown as {
      editTask(task: ProjectTask): void;
      editForm: { patchValue(value: object): void };
      saveTask(): void;
    };
    component.editTask(TASKS[0]);
    component.editForm.patchValue({
      department: 'P.KDHT',
      status: 'done',
      actualEndDate: '2026-08-19',
    });
    component.saveTask();

    expect(tasks.update).toHaveBeenCalledWith('task-1', {
      department: 'P.KDHT',
      plannedStartDate: '2026-08-10',
      plannedEndDate: '2026-08-20',
      actualEndDate: '2026-08-19',
      status: 'done',
    });
    expect(tasks.list).toHaveBeenCalledTimes(2);
  });

  it('cancels editing and rejects actual dates on unfinished tasks', async () => {
    await setup();
    const component = fixture.componentInstance as unknown as {
      editTask(task: ProjectTask): void;
      cancelEdit(): void;
      editingTaskId: { (): string | null };
      editForm: { patchValue(value: object): void };
      saveTask(): void;
    };
    component.editTask(TASKS[0]);
    component.cancelEdit();
    expect(component.editingTaskId()).toBeNull();

    component.editTask(TASKS[0]);
    component.editForm.patchValue({
      status: 'in_progress',
      actualEndDate: '2026-08-19',
    });
    component.saveTask();
    fixture.detectChanges();
    expect(tasks.update).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Chỉ ghi ngày hoàn thành thực tế',
    );
  });

  it('keeps the edit form open when updating fails', async () => {
    await setup();
    tasks.update.mockReturnValue(throwError(() => new Error('offline')));
    const component = fixture.componentInstance as unknown as {
      editTask(task: ProjectTask): void;
      editForm: { patchValue(value: object): void };
      saveTask(): void;
    };
    component.editTask(TASKS[0]);
    component.editForm.patchValue({ actualEndDate: '' });
    component.saveTask();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Không thể cập nhật công việc',
    );
  });

  it('shows a recoverable page error when loading fails', async () => {
    await setup();
    tasks.list.mockReturnValue(throwError(() => new Error('offline')));
    const component = fixture.componentInstance as unknown as { load(): void };
    component.load();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Không thể tải tiến độ thi công',
    );
  });
});
