import type {
  ProjectTask,
  ProjectMembershipRole,
  TaskOverview,
  TaskStatus,
} from '@project-ql/api-contracts';
import type { Pagination } from '../../core/http/pagination';

export interface TaskTemplate {
  step: number;
  name: string;
  department: string;
}

export interface TaskProjectAccess {
  id: string;
  code: string;
  name: string;
  myRole?: ProjectMembershipRole;
}

export interface ListTasksQuery extends Pagination {
  actorId: string;
  canManageAll: boolean;
  projectId?: string;
  status?: TaskStatus;
}

export interface UpdateTaskRecord {
  department?: string;
  plannedStartDate?: Date | null;
  plannedEndDate?: Date | null;
  actualEndDate?: Date | null;
  status?: TaskStatus;
  updatedBy: string;
}

export interface TaskRepository {
  list(query: ListTasksQuery): Promise<{
    tasks: ProjectTask[];
    totalItems: number;
    overview: TaskOverview;
  }>;
  initializePlan(
    project: TaskProjectAccess,
    templates: readonly TaskTemplate[],
    actorId: string,
  ): Promise<ProjectTask[]>;
  findByIdWithAccess(
    taskId: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<ProjectTask | null>;
  update(
    task: ProjectTask,
    input: UpdateTaskRecord,
  ): Promise<ProjectTask | null>;
}

export interface TaskProjectDirectory {
  findByIdWithAccess(
    projectId: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<TaskProjectAccess | null>;
}

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');
export const TASK_PROJECT_DIRECTORY = Symbol('TASK_PROJECT_DIRECTORY');
