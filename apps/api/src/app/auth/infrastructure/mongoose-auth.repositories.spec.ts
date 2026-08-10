import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  MongooseRefreshSessionRepository,
  MongooseRoleRepository,
  MongooseUserRepository,
} from './mongoose-auth.repositories';
import type {
  RefreshSessionEntity,
  RoleEntity,
  UserEntity,
} from './auth.schemas';

function queryResult<T>(value: T) {
  const query = {
    select: jest.fn(),
    lean: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };
  query.select.mockReturnValue(query);
  query.lean.mockReturnValue(query);
  return query;
}

describe('Mongoose auth repositories', () => {
  const userId = new Types.ObjectId().toString();
  const userDocument = {
    id: userId,
    email: 'admin@example.com',
    displayName: 'Administrator',
    passwordHash: 'argon2-hash',
    status: 'active' as const,
    roleCodes: ['admin'] as const,
  };

  it('maps authentication users and rejects malformed ids without querying', async () => {
    const emailQuery = queryResult(userDocument);
    const idQuery = queryResult(userDocument);
    const users = {
      findOne: jest.fn().mockReturnValue(emailQuery),
      findById: jest.fn().mockReturnValue(idQuery),
    };
    const repository = new MongooseUserRepository(
      users as unknown as Model<UserEntity>,
    );

    await expect(
      repository.findByEmailForAuthentication(userDocument.email),
    ).resolves.toEqual(userDocument);
    await expect(repository.findByIdForAuthentication(userId)).resolves.toEqual(
      userDocument,
    );
    await expect(
      repository.findByIdForAuthentication('not-an-object-id'),
    ).resolves.toBeNull();
    expect(emailQuery.select).toHaveBeenCalledWith('+passwordHash');
    expect(idQuery.select).toHaveBeenCalledWith('+passwordHash');
    expect(users.findById).toHaveBeenCalledTimes(1);
  });

  it('returns null when an authentication user does not exist', async () => {
    const users = {
      findOne: jest.fn().mockReturnValue(queryResult(null)),
      findById: jest.fn().mockReturnValue(queryResult(null)),
    };
    const repository = new MongooseUserRepository(
      users as unknown as Model<UserEntity>,
    );

    await expect(
      repository.findByEmailForAuthentication('missing@example.com'),
    ).resolves.toBeNull();
    await expect(
      repository.findByIdForAuthentication(userId),
    ).resolves.toBeNull();
  });

  it('deduplicates permissions from all matching roles', async () => {
    const roles = {
      find: jest
        .fn()
        .mockReturnValue(
          queryResult([
            { permissions: ['projects.read', 'tasks.read'] },
            { permissions: ['projects.read', 'projects.manage'] },
          ]),
        ),
    };
    const repository = new MongooseRoleRepository(
      roles as unknown as Model<RoleEntity>,
    );

    await expect(
      repository.findPermissionsByRoleCodes(['manager', 'member']),
    ).resolves.toEqual(['projects.read', 'tasks.read', 'projects.manage']);
  });

  it('creates, atomically consumes and deletes refresh sessions', async () => {
    const consumedUserId = new Types.ObjectId();
    const consumeQuery = queryResult({ userId: consumedUserId });
    const deleteQuery = queryResult(undefined);
    const sessions = {
      create: jest.fn().mockResolvedValue(undefined),
      findOneAndDelete: jest.fn().mockReturnValue(consumeQuery),
      deleteOne: jest.fn().mockReturnValue(deleteQuery),
    };
    const repository = new MongooseRefreshSessionRepository(
      sessions as unknown as Model<RefreshSessionEntity>,
    );
    const expiresAt = new Date('2026-09-09T00:00:00.000Z');

    await repository.create({ userId, tokenHash: 'hash', expiresAt });
    await expect(repository.consume('hash')).resolves.toEqual({
      userId: consumedUserId.toString(),
    });
    await repository.deleteByTokenHash('hash');

    expect(sessions.create).toHaveBeenCalledWith({
      userId: expect.any(Types.ObjectId),
      tokenHash: 'hash',
      expiresAt,
    });
    expect(sessions.findOneAndDelete).toHaveBeenCalledWith({
      tokenHash: 'hash',
      expiresAt: { $gt: expect.any(Date) },
    });
    expect(sessions.deleteOne).toHaveBeenCalledWith({ tokenHash: 'hash' });
  });

  it('returns null when a refresh session cannot be consumed', async () => {
    const sessions = {
      findOneAndDelete: jest.fn().mockReturnValue(queryResult(null)),
    };
    const repository = new MongooseRefreshSessionRepository(
      sessions as unknown as Model<RefreshSessionEntity>,
    );

    await expect(repository.consume('expired-hash')).resolves.toBeNull();
  });
});
