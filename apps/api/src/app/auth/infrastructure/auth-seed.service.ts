import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { PermissionCode, UserRoleCode } from '@project-ql/api-contracts';
import type { EnvironmentVariables } from '../../core/config/environment';
import type { PasswordHasher } from '../application/auth.ports';
import { PASSWORD_HASHER } from '../application/auth.ports';
import { RoleEntity, UserEntity } from './auth.schemas';

const ROLE_DEFINITIONS: Array<{
  code: UserRoleCode;
  name: string;
  permissions: PermissionCode[];
}> = [
  {
    code: 'admin',
    name: 'Administrator',
    permissions: [
      'users.read',
      'users.manage',
      'projects.read',
      'projects.manage',
      'tasks.read',
      'tasks.manage',
      'carrier-contracts.read',
      'carrier-contracts.manage',
      'revenue.read',
      'revenue.manage',
    ],
  },
  {
    code: 'manager',
    name: 'Manager',
    permissions: [
      'users.read',
      'projects.read',
      'projects.manage',
      'tasks.read',
      'tasks.manage',
      'carrier-contracts.read',
      'carrier-contracts.manage',
      'revenue.read',
      'revenue.manage',
    ],
  },
  {
    code: 'member',
    name: 'Member',
    permissions: [
      'projects.read',
      'tasks.read',
      'carrier-contracts.read',
      'revenue.read',
    ],
  },
];

@Injectable()
export class AuthSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthSeedService.name);

  constructor(
    @InjectModel(RoleEntity.name) private readonly roles: Model<RoleEntity>,
    @InjectModel(UserEntity.name) private readonly users: Model<UserEntity>,
    @Inject(PASSWORD_HASHER) private readonly passwords: PasswordHasher,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.roles.bulkWrite(
      ROLE_DEFINITIONS.map((role) => ({
        updateOne: {
          filter: { code: role.code },
          update: { $set: role },
          upsert: true,
        },
      })),
    );

    const email = this.config.get('SEED_ADMIN_EMAIL');
    const password = this.config.get('SEED_ADMIN_PASSWORD');
    if (!email || !password) return;
    const existing = await this.users.exists({ email });
    if (existing) return;

    await this.users.create({
      email,
      displayName: this.config.getOrThrow('SEED_ADMIN_DISPLAY_NAME'),
      passwordHash: await this.passwords.hash(password),
      status: 'active',
      roleCodes: ['admin'],
    });
    this.logger.log('Configured administrator account was created');
  }
}
