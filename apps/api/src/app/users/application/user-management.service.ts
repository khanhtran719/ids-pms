import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type {
  CreateUserRequest,
  PaginatedResponse,
  UserListItem,
} from '@project-ql/api-contracts';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../auth/application/auth.ports';
import {
  createPagination,
  createPaginationMeta,
} from '../../core/http/pagination';
import {
  USER_MANAGEMENT_REPOSITORY,
  type UserManagementRepository,
} from './user-management.ports';

@Injectable()
export class UserManagementService {
  constructor(
    @Inject(USER_MANAGEMENT_REPOSITORY)
    private readonly users: UserManagementRepository,
    @Inject(PASSWORD_HASHER) private readonly passwords: PasswordHasher,
  ) {}

  async create(input: CreateUserRequest): Promise<UserListItem> {
    const email = input.email.trim().toLowerCase();
    if (await this.users.emailExists(email)) {
      throw new ConflictException({
        code: 'USER_EMAIL_EXISTS',
        message: 'A user with this email already exists',
      });
    }
    const passwordHash = await this.passwords.hash(input.password);
    return this.users.createUser({
      email,
      displayName: input.displayName.trim(),
      passwordHash,
      status: 'active',
      roleCodes: input.roleCodes,
    });
  }

  async list(
    pageValue: number,
    limitValue: number,
  ): Promise<PaginatedResponse<UserListItem>> {
    const pagination = createPagination(pageValue, limitValue);
    const result = await this.users.listUsers(pagination);
    return {
      data: result.users,
      meta: createPaginationMeta(
        pagination.page,
        pagination.limit,
        result.totalItems,
      ),
    };
  }
}
