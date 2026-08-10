import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { PermissionCode, UserRoleCode } from '@project-ql/api-contracts';
import type {
  AuthenticationUserRecord,
  CreateRefreshSession,
  RefreshSessionRepository,
  RoleRepository,
  UserRepository,
} from '../application/auth.ports';
import {
  RefreshSessionEntity,
  RoleEntity,
  UserEntity,
  type UserDocument,
} from './auth.schemas';

@Injectable()
export class MongooseUserRepository implements UserRepository {
  constructor(
    @InjectModel(UserEntity.name)
    private readonly users: Model<UserEntity>,
  ) {}

  async findByEmailForAuthentication(
    email: string,
  ): Promise<AuthenticationUserRecord | null> {
    const user = await this.users
      .findOne({ email })
      .select('+passwordHash')
      .exec();
    return user ? this.toAuthenticationRecord(user) : null;
  }

  async findByIdForAuthentication(
    userId: string,
  ): Promise<AuthenticationUserRecord | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    const user = await this.users
      .findById(userId)
      .select('+passwordHash')
      .exec();
    return user ? this.toAuthenticationRecord(user) : null;
  }

  private toAuthenticationRecord(user: UserDocument): AuthenticationUserRecord {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      passwordHash: user.passwordHash,
      status: user.status,
      roleCodes: user.roleCodes,
    };
  }
}

@Injectable()
export class MongooseRoleRepository implements RoleRepository {
  constructor(
    @InjectModel(RoleEntity.name)
    private readonly roles: Model<RoleEntity>,
  ) {}

  async findPermissionsByRoleCodes(
    roleCodes: readonly UserRoleCode[],
  ): Promise<PermissionCode[]> {
    const roles = await this.roles
      .find({ code: { $in: roleCodes } })
      .select({ permissions: 1 })
      .lean()
      .exec();
    const permissions = new Set<PermissionCode>();
    for (const role of roles) {
      for (const permission of role.permissions) permissions.add(permission);
    }
    return [...permissions];
  }
}

@Injectable()
export class MongooseRefreshSessionRepository
  implements RefreshSessionRepository
{
  constructor(
    @InjectModel(RefreshSessionEntity.name)
    private readonly sessions: Model<RefreshSessionEntity>,
  ) {}

  async create(session: CreateRefreshSession): Promise<void> {
    await this.sessions.create({
      ...session,
      userId: new Types.ObjectId(session.userId),
    });
  }

  async consume(tokenHash: string): Promise<{ userId: string } | null> {
    const session = await this.sessions
      .findOneAndDelete({ tokenHash, expiresAt: { $gt: new Date() } })
      .lean()
      .exec();
    return session ? { userId: session.userId.toString() } : null;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.sessions.deleteOne({ tokenHash }).exec();
  }
}
