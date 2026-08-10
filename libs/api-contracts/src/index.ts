export type ServiceAvailability = 'up' | 'down';

export interface SystemHealth {
  status: 'ok' | 'degraded';
  services: {
    api: ServiceAvailability;
    database: ServiceAvailability;
  };
  timestamp: string;
}

export interface LivenessHealth {
  status: 'ok';
  services: {
    api: 'up';
  };
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  path: string;
  requestId: string;
  timestamp: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export type UserRoleCode = 'admin' | 'manager' | 'member';
export type UserStatus = 'active' | 'disabled';
export type PermissionCode =
  | 'users.read'
  | 'users.manage'
  | 'projects.read'
  | 'projects.manage'
  | 'tasks.read'
  | 'tasks.manage';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  roleCodes: UserRoleCode[];
  permissions: PermissionCode[];
}

export interface AuthSessionResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: AuthUser;
}

export interface UserListItem {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  roleCodes: UserRoleCode[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  displayName: string;
  password: string;
  roleCodes: UserRoleCode[];
}

export type ProjectStatus =
  | 'planning'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'archived';

export type ProjectMembershipRole = 'owner' | 'manager' | 'member';

export interface ProjectListItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  dueDate?: string;
  memberCount: number;
  myRole?: ProjectMembershipRole;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectListItem {
  createdBy: string;
  createdAt: string;
}

export interface ProjectMember {
  userId: string;
  email: string;
  displayName: string;
  status: UserStatus;
  role: ProjectMembershipRole;
  joinedAt: string;
}

export interface ProjectMemberCandidate {
  userId: string;
  email: string;
  displayName: string;
}

export interface CreateProjectRequest {
  code: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  dueDate?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string | null;
  dueDate?: string | null;
}

export interface UpsertProjectMemberRequest {
  userId: string;
  role: ProjectMembershipRole;
}
