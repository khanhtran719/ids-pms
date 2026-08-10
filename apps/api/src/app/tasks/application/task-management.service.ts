import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  PermissionCode,
  ProjectTask,
  TaskListResponse,
  TaskStatus,
  UpdateTaskRequest,
} from '@project-ql/api-contracts';
import {
  createPagination,
  createPaginationMeta,
} from '../../core/http/pagination';
import {
  TASK_PROJECT_DIRECTORY,
  TASK_REPOSITORY,
  type TaskProjectDirectory,
  type TaskRepository,
  type TaskTemplate,
  type UpdateTaskRecord,
} from './task-management.ports';

const STANDARD_TASK_PLAN: readonly TaskTemplate[] = [
  {
    step: 1,
    name: 'Hồ sơ thiết kế phê duyệt',
    department: 'P.KTDA',
  },
  {
    step: 2,
    name: 'Chuẩn bị vật tư, pháp lý, mặt bằng',
    department: 'P.KTDA',
  },
  { step: 3, name: 'Tổ chức thi công', department: 'P.KTDA' },
  {
    step: 4,
    name: 'Kết nối nhà mạng CĐBR/IBS',
    department: 'P.KDHT',
  },
  { step: 5, name: 'Bàn giao đưa vào VHKT', department: 'P.KTDA' },
];

@Injectable()
export class TaskManagementService {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
    @Inject(TASK_PROJECT_DIRECTORY)
    private readonly projects: TaskProjectDirectory,
  ) {}

  async list(
    actorId: string,
    permissions: readonly PermissionCode[],
    pageValue: number,
    limitValue: number,
    projectId?: string,
    status?: TaskStatus,
  ): Promise<TaskListResponse> {
    const pagination = createPagination(pageValue, limitValue);
    const result = await this.tasks.list({
      ...pagination,
      actorId,
      canManageAll: permissions.includes('projects.manage'),
      ...(projectId ? { projectId } : {}),
      ...(status ? { status } : {}),
    });
    return {
      data: result.tasks,
      meta: createPaginationMeta(
        pagination.page,
        pagination.limit,
        result.totalItems,
      ),
      overview: result.overview,
    };
  }

  async initializePlan(
    projectId: string,
    actorId: string,
    permissions: readonly PermissionCode[],
  ): Promise<ProjectTask[]> {
    const project = await this.projects.findByIdWithAccess(
      projectId,
      actorId,
      permissions.includes('projects.manage'),
    );
    if (!project) this.throwProjectNotFound();
    return this.tasks.initializePlan(project, STANDARD_TASK_PLAN, actorId);
  }

  async update(
    taskId: string,
    actorId: string,
    permissions: readonly PermissionCode[],
    input: UpdateTaskRequest,
  ): Promise<ProjectTask> {
    const current = await this.tasks.findByIdWithAccess(
      taskId,
      actorId,
      permissions.includes('projects.manage'),
    );
    if (!current) this.throwTaskNotFound();

    const update = this.normalizeUpdate(input, actorId);
    const plannedStartDate = this.mergedDate(
      current.plannedStartDate,
      update.plannedStartDate,
    );
    const plannedEndDate = this.mergedDate(
      current.plannedEndDate,
      update.plannedEndDate,
    );
    if (
      plannedStartDate &&
      plannedEndDate &&
      plannedEndDate < plannedStartDate
    ) {
      throw new BadRequestException({
        code: 'TASK_DATE_RANGE_INVALID',
        message: 'Planned end date cannot be earlier than planned start date',
      });
    }

    const status = update.status ?? current.status;
    const actualEndDate = this.mergedDate(
      current.actualEndDate,
      update.actualEndDate,
    );
    if (status === 'done' && !actualEndDate) {
      throw new BadRequestException({
        code: 'TASK_ACTUAL_END_REQUIRED',
        message: 'Actual end date is required when completing a task',
      });
    }
    if (status !== 'done' && actualEndDate) {
      throw new BadRequestException({
        code: 'TASK_ACTUAL_END_STATUS_INVALID',
        message: 'Actual end date can only be recorded for a completed task',
      });
    }

    const updated = await this.tasks.update(current, update);
    if (!updated) this.throwTaskNotFound();
    return updated;
  }

  private normalizeUpdate(
    input: UpdateTaskRequest,
    actorId: string,
  ): UpdateTaskRecord {
    return {
      ...(input.department !== undefined
        ? { department: input.department.trim() }
        : {}),
      ...(input.plannedStartDate !== undefined
        ? {
            plannedStartDate: input.plannedStartDate
              ? this.parseDate(input.plannedStartDate)
              : null,
          }
        : {}),
      ...(input.plannedEndDate !== undefined
        ? {
            plannedEndDate: input.plannedEndDate
              ? this.parseDate(input.plannedEndDate)
              : null,
          }
        : {}),
      ...(input.actualEndDate !== undefined
        ? {
            actualEndDate: input.actualEndDate
              ? this.parseDate(input.actualEndDate)
              : null,
          }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updatedBy: actorId,
    };
  }

  private parseDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException({
        code: 'TASK_DATE_INVALID',
        message: 'Task date is invalid',
      });
    }
    return date;
  }

  private mergedDate(
    currentValue: string | undefined,
    updateValue: Date | null | undefined,
  ): Date | undefined {
    if (updateValue === null) return undefined;
    if (updateValue !== undefined) return updateValue;
    return currentValue ? this.parseDate(currentValue) : undefined;
  }

  private throwProjectNotFound(): never {
    throw new NotFoundException({
      code: 'PROJECT_NOT_FOUND',
      message: 'Project was not found',
    });
  }

  private throwTaskNotFound(): never {
    throw new NotFoundException({
      code: 'TASK_NOT_FOUND',
      message: 'Task was not found',
    });
  }
}
