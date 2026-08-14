import type {
  ProjectActivity,
  ProjectActivityType,
} from '@project-ql/api-contracts';
import type { Pagination } from '../../core/http/pagination';

export interface ProjectActivityListQuery extends Pagination {
  projectId: string;
  actorId: string;
  canManageAll: boolean;
}

export interface ProjectActivityCreateContext {
  projectId: string;
  authorId: string;
  authorDisplayName: string;
  authorEmail: string;
}

export interface CreateProjectActivityRecord
  extends ProjectActivityCreateContext {
  type: ProjectActivityType;
  content: string;
}

export interface ProjectActivityRepository {
  list(query: ProjectActivityListQuery): Promise<{
    activities: ProjectActivity[];
    totalItems: number;
  } | null>;
  resolveCreateContext(
    projectId: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<ProjectActivityCreateContext | null>;
  create(input: CreateProjectActivityRecord): Promise<ProjectActivity>;
}

export const PROJECT_ACTIVITY_REPOSITORY = Symbol(
  'PROJECT_ACTIVITY_REPOSITORY',
);
