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
