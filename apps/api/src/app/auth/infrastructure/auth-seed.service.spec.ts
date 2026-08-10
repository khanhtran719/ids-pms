import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Model } from 'mongoose';
import type { EnvironmentVariables } from '../../core/config/environment';
import type { PasswordHasher } from '../application/auth.ports';
import { AuthSeedService } from './auth-seed.service';
import type { RoleEntity, UserEntity } from './auth.schemas';

describe('AuthSeedService', () => {
  let roles: { bulkWrite: jest.Mock };
  let users: { exists: jest.Mock; create: jest.Mock };
  let passwords: jest.Mocked<PasswordHasher>;
  let config: { get: jest.Mock; getOrThrow: jest.Mock };

  beforeEach(() => {
    roles = { bulkWrite: jest.fn().mockResolvedValue(undefined) };
    users = {
      exists: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
    };
    passwords = { hash: jest.fn(), verify: jest.fn() };
    config = { get: jest.fn(), getOrThrow: jest.fn() };
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  function createService(): AuthSeedService {
    return new AuthSeedService(
      roles as unknown as Model<RoleEntity>,
      users as unknown as Model<UserEntity>,
      passwords,
      config as unknown as ConfigService<EnvironmentVariables, true>,
    );
  }

  it('synchronizes standard roles without requiring an admin credential', async () => {
    config.get.mockReturnValue(undefined);

    await createService().onApplicationBootstrap();

    expect(roles.bulkWrite).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          updateOne: expect.objectContaining({
            filter: { code: 'admin' },
            upsert: true,
          }),
        }),
        expect.objectContaining({
          updateOne: expect.objectContaining({
            filter: { code: 'member' },
            upsert: true,
          }),
        }),
      ]),
    );
    expect(users.exists).not.toHaveBeenCalled();
  });

  it('does not recreate an existing configured administrator', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'SEED_ADMIN_EMAIL' ? 'admin@example.com' : 'temporary-password',
    );
    users.exists.mockResolvedValue({ _id: 'existing' });

    await createService().onApplicationBootstrap();

    expect(users.exists).toHaveBeenCalledWith({ email: 'admin@example.com' });
    expect(passwords.hash).not.toHaveBeenCalled();
    expect(users.create).not.toHaveBeenCalled();
  });

  it('hashes the configured password and creates the first administrator', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'SEED_ADMIN_EMAIL' ? 'admin@example.com' : 'temporary-password',
    );
    config.getOrThrow.mockReturnValue('System Administrator');
    passwords.hash.mockResolvedValue('argon2-hash');

    await createService().onApplicationBootstrap();

    expect(passwords.hash).toHaveBeenCalledWith('temporary-password');
    expect(users.create).toHaveBeenCalledWith({
      email: 'admin@example.com',
      displayName: 'System Administrator',
      passwordHash: 'argon2-hash',
      status: 'active',
      roleCodes: ['admin'],
    });
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      'Configured administrator account was created',
    );
  });
});
