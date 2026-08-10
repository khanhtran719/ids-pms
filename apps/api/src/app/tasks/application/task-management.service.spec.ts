import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { PermissionCode, ProjectTask } from '@project-ql/api-contracts';
import type {
  TaskProjectDirectory,
  TaskRepository,
} from './task-management.ports';
import { TaskManagementService } from './task-management.service';

const TASK: ProjectTask = {
  id: 'task-1',
  projectId: 'project-1',
  projectCode: 'IDS',
  projectName: 'IDS PMS',
  step: 1,
  name: 'Hồ sơ thiết kế phê duyệt',
  department: 'P.KTDA',
  status: 'todo',
  updatedAt: '2026-08-10T00:00:00.000Z',
};

describe('TaskManagementService', () => {
  let tasks: jest.Mocked<TaskRepository>;
  let projects: jest.Mocked<TaskProjectDirectory>;
  let service: TaskManagementService;

  beforeEach(() => {
    tasks = {
      list: jest.fn().mockResolvedValue({
        tasks: [TASK],
        totalItems: 1,
        overview: {
          totalTasks: 1,
          completedTasks: 0,
          tasksWithActualEnd: 0,
          trackedProjects: 1,
        },
      }),
      initializePlan: jest.fn().mockResolvedValue([TASK]),
      findByIdWithAccess: jest.fn().mockResolvedValue(TASK),
      update: jest.fn().mockResolvedValue(TASK),
    };
    projects = {
      findByIdWithAccess: jest.fn().mockResolvedValue({
        id: 'project-1',
        code: 'IDS',
        name: 'IDS PMS',
        myRole: 'owner',
      }),
    };
    service = new TaskManagementService(tasks, projects);
  });

  it('lists only accessible tasks and preserves one-query overview metadata', async () => {
    const result = await service.list(
      'user-1',
      ['tasks.read'],
      1,
      20,
      'project-1',
      'in_progress',
    );

    expect(tasks.list).toHaveBeenCalledWith({
      actorId: 'user-1',
      canManageAll: false,
      page: 1,
      limit: 20,
      skip: 0,
      projectId: 'project-1',
      status: 'in_progress',
    });
    expect(result.meta.totalItems).toBe(1);
    expect(result.overview.trackedProjects).toBe(1);
  });

  it('initializes the five mockup steps without manufacturing schedule dates', async () => {
    await service.initializePlan('project-1', 'user-1', [
      'projects.read',
      'tasks.manage',
    ]);

    expect(tasks.initializePlan).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'project-1' }),
      [
        expect.objectContaining({ step: 1, department: 'P.KTDA' }),
        expect.objectContaining({ step: 2, department: 'P.KTDA' }),
        expect.objectContaining({ step: 3, department: 'P.KTDA' }),
        expect.objectContaining({ step: 4, department: 'P.KDHT' }),
        expect.objectContaining({ step: 5, department: 'P.KTDA' }),
      ],
      'user-1',
    );
  });

  it('returns not found when initializing a project outside the actor scope', async () => {
    projects.findByIdWithAccess.mockResolvedValue(null);

    await expect(
      service.initializePlan('missing', 'user-1', ['tasks.manage']),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires an actual end date when a task is completed', async () => {
    await expect(
      service.update('task-1', 'user-1', ['tasks.manage'], {
        status: 'done',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tasks.update).not.toHaveBeenCalled();
  });

  it('validates the merged date range and stores normalized updates once', async () => {
    tasks.findByIdWithAccess.mockResolvedValue({
      ...TASK,
      plannedStartDate: '2026-08-10T00:00:00.000Z',
      plannedEndDate: '2026-08-20T00:00:00.000Z',
    });

    await service.update(
      'task-1',
      'user-1',
      ['tasks.manage', 'projects.manage'] as PermissionCode[],
      {
        department: '  P.KDHT  ',
        status: 'done',
        actualEndDate: '2026-08-19',
      },
    );

    expect(tasks.findByIdWithAccess).toHaveBeenCalledWith(
      'task-1',
      'user-1',
      true,
    );
    expect(tasks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'task-1',
        plannedStartDate: '2026-08-10T00:00:00.000Z',
        plannedEndDate: '2026-08-20T00:00:00.000Z',
      }),
      {
        department: 'P.KDHT',
        status: 'done',
        actualEndDate: new Date('2026-08-19'),
        updatedBy: 'user-1',
      },
    );
  });

  it('rejects a planned end before the current planned start', async () => {
    tasks.findByIdWithAccess.mockResolvedValue({
      ...TASK,
      plannedStartDate: '2026-08-20T00:00:00.000Z',
    });

    await expect(
      service.update('task-1', 'user-1', ['tasks.manage'], {
        plannedEndDate: '2026-08-10',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an actual end date while the task is still in progress', async () => {
    await expect(
      service.update('task-1', 'user-1', ['tasks.manage'], {
        status: 'in_progress',
        actualEndDate: '2026-08-19',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns not found when the task disappears before or during update', async () => {
    tasks.findByIdWithAccess.mockResolvedValueOnce(null);
    await expect(
      service.update('missing', 'user-1', ['tasks.manage'], {}),
    ).rejects.toBeInstanceOf(NotFoundException);

    tasks.findByIdWithAccess.mockResolvedValueOnce(TASK);
    tasks.update.mockResolvedValueOnce(null);
    await expect(
      service.update('task-1', 'user-1', ['tasks.manage'], {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
