import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UserListItem } from '@project-ql/api-contracts';
import { UserEntity } from '../../auth/infrastructure/auth.schemas';
import type { Pagination } from '../../core/http/pagination';
import type {
  CreateUserRecord,
  UserManagementRepository,
} from '../application/user-management.ports';

@Injectable()
export class MongooseUserManagementRepository
  implements UserManagementRepository
{
  constructor(
    @InjectModel(UserEntity.name)
    private readonly users: Model<UserEntity>,
  ) {}

  async emailExists(email: string): Promise<boolean> {
    return Boolean(await this.users.exists({ email }));
  }

  async createUser(user: CreateUserRecord): Promise<UserListItem> {
    const created = await this.users.create(user);
    return this.toListItem(created);
  }

  async listUsers(
    pagination: Pagination,
  ): Promise<{ users: UserListItem[]; totalItems: number }> {
    const [users, totalItems] = await Promise.all([
      this.users
        .find()
        .sort({ createdAt: -1, _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .exec(),
      this.users.countDocuments().exec(),
    ]);
    return {
      users: users.map((user) => this.toListItem(user)),
      totalItems,
    };
  }

  private toListItem(user: UserEntity & { id: string }): UserListItem {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      roleCodes: user.roleCodes,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
