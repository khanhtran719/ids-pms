import type { UserListItem, UserRoleCode } from '@project-ql/api-contracts';
import type { Pagination } from '../../core/http/pagination';

export interface CreateUserRecord {
  email: string;
  displayName: string;
  passwordHash: string;
  status: 'active';
  roleCodes: UserRoleCode[];
}

export interface UserManagementRepository {
  emailExists(email: string): Promise<boolean>;
  createUser(user: CreateUserRecord): Promise<UserListItem>;
  listUsers(
    pagination: Pagination,
  ): Promise<{ users: UserListItem[]; totalItems: number }>;
}

export const USER_MANAGEMENT_REPOSITORY = Symbol('USER_MANAGEMENT_REPOSITORY');
