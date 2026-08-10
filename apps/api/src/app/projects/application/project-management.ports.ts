import type {
  ProjectDetail,
  ProjectMember,
  ProjectMembershipRole,
  ProjectStatus,
} from '@project-ql/api-contracts';
import type { Pagination } from '../../core/http/pagination';

export interface CreateProjectRecord {
  code: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: Date;
  dueDate?: Date;
  createdBy: string;
  ownerUserId: string;
}

export interface UpdateProjectRecord {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: Date | null;
  dueDate?: Date | null;
}

export interface ListProjectsQuery extends Pagination {
  actorId: string;
  canManageAll: boolean;
  status?: ProjectStatus;
}

export type MembershipWriteResult = ProjectMember | 'last_owner';
export type MembershipRemoveResult = 'removed' | 'not_found' | 'last_owner';

export interface ProjectRepository {
  codeExists(code: string): Promise<boolean>;
  createWithOwner(input: CreateProjectRecord): Promise<ProjectDetail>;
  list(
    query: ListProjectsQuery,
  ): Promise<{ projects: ProjectDetail[]; totalItems: number }>;
  findByIdWithAccess(
    projectId: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<ProjectDetail | null>;
  update(projectId: string, input: UpdateProjectRecord): Promise<boolean>;
  listMembers(projectId: string): Promise<ProjectMember[]>;
  upsertMemberSafely(input: {
    projectId: string;
    userId: string;
    role: ProjectMembershipRole;
    actorId: string;
  }): Promise<MembershipWriteResult>;
  removeMemberSafely(
    projectId: string,
    userId: string,
  ): Promise<MembershipRemoveResult>;
}

export interface ProjectUserDirectory {
  findActiveById(userId: string): Promise<{
    id: string;
    email: string;
    displayName: string;
  } | null>;
  listActive(
    search: string | undefined,
    limit: number,
  ): Promise<
    Array<{
      id: string;
      email: string;
      displayName: string;
    }>
  >;
}

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');
export const PROJECT_USER_DIRECTORY = Symbol('PROJECT_USER_DIRECTORY');
