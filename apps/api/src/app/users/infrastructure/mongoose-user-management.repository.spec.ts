import type { Model } from 'mongoose';
import type { UserEntity } from '../../auth/infrastructure/auth.schemas';
import { MongooseUserManagementRepository } from './mongoose-user-management.repository';

function queryResult<T>(value: T) {
  const query = {
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };
  query.sort.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

describe('MongooseUserManagementRepository', () => {
  const dates = {
    createdAt: new Date('2026-08-10T00:00:00.000Z'),
    updatedAt: new Date('2026-08-11T00:00:00.000Z'),
  };
  const user = {
    id: '507f1f77bcf86cd799439011',
    email: 'member@example.com',
    displayName: 'Member',
    status: 'active' as const,
    roleCodes: ['member'] as const,
    ...dates,
  };

  it('checks email existence without loading the user', async () => {
    const users = { exists: jest.fn().mockResolvedValue({ _id: user.id }) };
    const repository = new MongooseUserManagementRepository(
      users as unknown as Model<UserEntity>,
    );

    await expect(repository.emailExists(user.email)).resolves.toBe(true);
    users.exists.mockResolvedValue(null);
    await expect(repository.emailExists('missing@example.com')).resolves.toBe(
      false,
    );
  });

  it('creates and maps a user without persistence-only fields', async () => {
    const users = { create: jest.fn().mockResolvedValue(user) };
    const repository = new MongooseUserManagementRepository(
      users as unknown as Model<UserEntity>,
    );

    await expect(
      repository.createUser({
        email: user.email,
        displayName: user.displayName,
        passwordHash: 'argon2-hash',
        status: 'active',
        roleCodes: ['member'],
      }),
    ).resolves.toEqual({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: 'active',
      roleCodes: ['member'],
      createdAt: dates.createdAt.toISOString(),
      updatedAt: dates.updatedAt.toISOString(),
    });
  });

  it('runs one paginated query and count in parallel', async () => {
    const findQuery = queryResult([user]);
    const countQuery = queryResult(7);
    const users = {
      find: jest.fn().mockReturnValue(findQuery),
      countDocuments: jest.fn().mockReturnValue(countQuery),
    };
    const repository = new MongooseUserManagementRepository(
      users as unknown as Model<UserEntity>,
    );

    await expect(
      repository.listUsers({ page: 2, limit: 20, skip: 20 }),
    ).resolves.toEqual({
      users: [expect.objectContaining({ id: user.id, email: user.email })],
      totalItems: 7,
    });
    expect(findQuery.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
    expect(findQuery.skip).toHaveBeenCalledWith(20);
    expect(findQuery.limit).toHaveBeenCalledWith(20);
  });
});
