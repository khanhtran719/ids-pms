import type { Connection, Model } from 'mongoose';
import { Types } from 'mongoose';
import type { UserEntity } from '../../auth/infrastructure/auth.schemas';
import {
  MongooseProjectRepository,
  MongooseProjectUserDirectory,
} from './mongoose-project.repositories';
import type { ProjectEntity, ProjectMembershipEntity } from './project.schemas';

function queryResult<T>(value: T) {
  const query = {
    select: jest.fn(),
    lean: jest.fn(),
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    session: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };
  query.select.mockReturnValue(query);
  query.lean.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.session.mockReturnValue(query);
  return query;
}

function transactionSession() {
  const session = {
    withTransaction: jest.fn(async (work: () => Promise<void>) => work()),
    endSession: jest.fn().mockResolvedValue(undefined),
  };
  return session;
}

describe('MongooseProjectRepository', () => {
  const projectId = new Types.ObjectId();
  const actorId = new Types.ObjectId();
  const memberId = new Types.ObjectId();
  const createdAt = new Date('2026-08-10T00:00:00.000Z');
  const updatedAt = new Date('2026-08-11T00:00:00.000Z');
  const projectRow = {
    _id: projectId,
    code: 'IDS',
    name: 'IDS PMS',
    description: 'Project management',
    status: 'active' as const,
    startDate: new Date('2026-08-10T00:00:00.000Z'),
    dueDate: new Date('2026-09-10T00:00:00.000Z'),
    createdBy: actorId,
    createdAt,
    updatedAt,
  };

  function createRepository(
    projects: Record<string, jest.Mock>,
    memberships: Record<string, jest.Mock>,
    session = transactionSession(),
  ) {
    const connection = {
      startSession: jest.fn().mockResolvedValue(session),
    };
    return {
      repository: new MongooseProjectRepository(
        projects as unknown as Model<ProjectEntity>,
        memberships as unknown as Model<ProjectMembershipEntity>,
        connection as unknown as Connection,
      ),
      session,
      connection,
    };
  }

  it('checks normalized project-code existence', async () => {
    const projects = {
      exists: jest.fn().mockResolvedValue({ _id: projectId }),
    };
    const { repository } = createRepository(projects, {});

    await expect(repository.codeExists('IDS')).resolves.toBe(true);
    projects.exists.mockResolvedValue(null);
    await expect(repository.codeExists('OTHER')).resolves.toBe(false);
  });

  it('creates a project and its first owner in one transaction', async () => {
    const projectDocument = {
      ...projectRow,
      toObject: jest.fn().mockReturnValue(projectRow),
    };
    const projects = {
      create: jest.fn().mockResolvedValue([projectDocument]),
    };
    const memberships = { create: jest.fn().mockResolvedValue(undefined) };
    const { repository, session } = createRepository(projects, memberships);

    await expect(
      repository.createWithOwner({
        code: 'IDS',
        name: 'IDS PMS',
        description: 'Project management',
        status: 'active',
        startDate: projectRow.startDate,
        dueDate: projectRow.dueDate,
        createdBy: actorId.toString(),
        ownerUserId: actorId.toString(),
      }),
    ).resolves.toMatchObject({
      id: projectId.toString(),
      code: 'IDS',
      memberCount: 1,
      myRole: 'owner',
      startDate: projectRow.startDate.toISOString(),
      dueDate: projectRow.dueDate.toISOString(),
    });
    expect(projects.create).toHaveBeenCalledWith(
      [expect.objectContaining({ createdBy: expect.any(Types.ObjectId) })],
      { session },
    );
    expect(memberships.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          projectId,
          userId: expect.any(Types.ObjectId),
          role: 'owner',
        }),
      ],
      { session },
    );
    expect(session.endSession).toHaveBeenCalled();
  });

  it('always ends a transaction and rejects when it did not commit', async () => {
    const session = transactionSession();
    session.withTransaction.mockResolvedValue(undefined);
    const { repository } = createRepository({}, {}, session);

    await expect(
      repository.createWithOwner({
        code: 'IDS',
        name: 'IDS PMS',
        status: 'planning',
        createdBy: actorId.toString(),
        ownerUserId: actorId.toString(),
      }),
    ).rejects.toThrow('Project transaction did not commit');
    expect(session.endSession).toHaveBeenCalled();
  });

  it('returns immediately when a regular user has no project memberships', async () => {
    const membershipQuery = queryResult([]);
    const memberships = {
      find: jest.fn().mockReturnValue(membershipQuery),
    };
    const projects = { find: jest.fn() };
    const { repository } = createRepository(projects, memberships);

    await expect(
      repository.list({
        page: 1,
        actorId: actorId.toString(),
        canManageAll: false,
        skip: 0,
        limit: 20,
      }),
    ).resolves.toEqual({ projects: [], totalItems: 0 });
    expect(projects.find).not.toHaveBeenCalled();
  });

  it('lists projects with one aggregate for membership statistics', async () => {
    const secondProjectId = new Types.ObjectId();
    const projectQuery = queryResult([
      projectRow,
      {
        ...projectRow,
        _id: secondProjectId,
        code: 'NO-DATES',
        description: undefined,
        startDate: undefined,
        dueDate: undefined,
      },
    ]);
    const countQuery = queryResult(2);
    const projects = {
      find: jest.fn().mockReturnValue(projectQuery),
      countDocuments: jest.fn().mockReturnValue(countQuery),
    };
    const memberships = {
      aggregate: jest
        .fn()
        .mockResolvedValue([
          { _id: projectId, memberCount: 3, myRole: 'manager' },
        ]),
    };
    const { repository } = createRepository(projects, memberships);

    const result = await repository.list({
      page: 3,
      actorId: actorId.toString(),
      canManageAll: true,
      status: 'active',
      skip: 20,
      limit: 10,
    });

    expect(projects.find).toHaveBeenCalledWith({ status: 'active' });
    expect(projectQuery.skip).toHaveBeenCalledWith(20);
    expect(projectQuery.limit).toHaveBeenCalledWith(10);
    expect(memberships.aggregate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      projects: [
        expect.objectContaining({
          id: projectId.toString(),
          memberCount: 3,
          myRole: 'manager',
          description: 'Project management',
        }),
        expect.objectContaining({
          id: secondProjectId.toString(),
          memberCount: 0,
        }),
      ],
      totalItems: 2,
    });
    expect(result.projects[1]).not.toHaveProperty('description');
    expect(result.projects[1]).not.toHaveProperty('startDate');
  });

  it('returns an empty page without running the aggregate', async () => {
    const projects = {
      find: jest.fn().mockReturnValue(queryResult([])),
      countDocuments: jest.fn().mockReturnValue(queryResult(4)),
    };
    const memberships = { aggregate: jest.fn() };
    const { repository } = createRepository(projects, memberships);

    await expect(
      repository.list({
        page: 2,
        actorId: actorId.toString(),
        canManageAll: true,
        skip: 20,
        limit: 20,
      }),
    ).resolves.toEqual({ projects: [], totalItems: 4 });
    expect(memberships.aggregate).not.toHaveBeenCalled();
  });

  it('checks project access before loading details', async () => {
    const memberships = {
      findOne: jest.fn().mockReturnValue(queryResult(null)),
      countDocuments: jest.fn().mockReturnValue(queryResult(2)),
    };
    const projects = {
      findById: jest.fn().mockReturnValue(queryResult(projectRow)),
    };
    const { repository } = createRepository(projects, memberships);

    await expect(
      repository.findByIdWithAccess('invalid-id', actorId.toString(), false),
    ).resolves.toBeNull();
    await expect(
      repository.findByIdWithAccess(
        projectId.toString(),
        actorId.toString(),
        false,
      ),
    ).resolves.toBeNull();
    await expect(
      repository.findByIdWithAccess(
        projectId.toString(),
        actorId.toString(),
        true,
      ),
    ).resolves.toMatchObject({
      id: projectId.toString(),
      memberCount: 2,
    });
    expect(projects.findById).toHaveBeenCalledTimes(1);
  });

  it('maps set/unset updates and handles malformed ids', async () => {
    const updateQuery = queryResult({ matchedCount: 1 });
    const projects = { updateOne: jest.fn().mockReturnValue(updateQuery) };
    const { repository } = createRepository(projects, {});

    await expect(
      repository.update(projectId.toString(), {
        name: 'Updated',
        startDate: null,
      }),
    ).resolves.toBe(true);
    await expect(
      repository.update('invalid-id', { name: 'Ignored' }),
    ).resolves.toBe(false);
    expect(projects.updateOne).toHaveBeenCalledWith(
      { _id: projectId.toString() },
      { $set: { name: 'Updated' }, $unset: { startDate: 1 } },
      { runValidators: true },
    );
  });

  it('maps the aggregated member directory and rejects malformed ids', async () => {
    const memberships = {
      aggregate: jest.fn().mockResolvedValue([
        {
          userId: memberId,
          email: 'member@example.com',
          displayName: 'Member',
          status: 'active',
          role: 'member',
          joinedAt: createdAt,
        },
      ]),
    };
    const { repository } = createRepository({}, memberships);

    await expect(repository.listMembers('invalid-id')).resolves.toEqual([]);
    await expect(repository.listMembers(projectId.toString())).resolves.toEqual(
      [
        {
          userId: memberId.toString(),
          email: 'member@example.com',
          displayName: 'Member',
          status: 'active',
          role: 'member',
          joinedAt: createdAt.toISOString(),
        },
      ],
    );
  });

  it('prevents demoting the final owner inside the transaction', async () => {
    const memberships = {
      findOne: jest.fn().mockReturnValue(queryResult({ role: 'owner' })),
      countDocuments: jest.fn().mockReturnValue(queryResult(1)),
      findOneAndUpdate: jest.fn(),
    };
    const { repository, session } = createRepository({}, memberships);

    await expect(
      repository.upsertMemberSafely({
        projectId: projectId.toString(),
        userId: actorId.toString(),
        role: 'member',
        actorId: actorId.toString(),
      }),
    ).resolves.toBe('last_owner');
    expect(memberships.findOneAndUpdate).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });

  it('upserts and reloads a member after the transaction commits', async () => {
    const member = {
      userId: memberId,
      email: 'member@example.com',
      displayName: 'Member',
      status: 'active',
      role: 'manager',
      joinedAt: createdAt,
    };
    const memberships = {
      findOne: jest.fn().mockReturnValue(queryResult(null)),
      findOneAndUpdate: jest.fn().mockResolvedValue(undefined),
      aggregate: jest.fn().mockResolvedValue([member]),
    };
    const { repository } = createRepository({}, memberships);

    await expect(
      repository.upsertMemberSafely({
        projectId: projectId.toString(),
        userId: memberId.toString(),
        role: 'manager',
        actorId: actorId.toString(),
      }),
    ).resolves.toEqual({
      userId: memberId.toString(),
      email: member.email,
      displayName: member.displayName,
      status: 'active',
      role: 'manager',
      joinedAt: createdAt.toISOString(),
    });
    expect(memberships.findOneAndUpdate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ $set: { role: 'manager' } }),
      expect.objectContaining({ upsert: true, runValidators: true }),
    );
  });

  it('returns each safe membership removal outcome', async () => {
    const memberships = {
      findOne: jest
        .fn()
        .mockReturnValueOnce(queryResult({ role: 'owner' }))
        .mockReturnValueOnce(queryResult({ role: 'member' })),
      countDocuments: jest.fn().mockReturnValue(queryResult(1)),
      deleteOne: jest.fn().mockReturnValue(queryResult(undefined)),
    };
    const { repository } = createRepository({}, memberships);

    await expect(
      repository.removeMemberSafely('invalid', memberId.toString()),
    ).resolves.toBe('not_found');
    await expect(
      repository.removeMemberSafely(projectId.toString(), actorId.toString()),
    ).resolves.toBe('last_owner');
    await expect(
      repository.removeMemberSafely(projectId.toString(), memberId.toString()),
    ).resolves.toBe('removed');
    expect(memberships.deleteOne).toHaveBeenCalledTimes(1);
  });
});

describe('MongooseProjectUserDirectory', () => {
  const userId = new Types.ObjectId();

  it('finds active users and short-circuits malformed ids', async () => {
    const users = {
      findOne: jest.fn().mockReturnValue(
        queryResult({
          _id: userId,
          email: 'member@example.com',
          displayName: 'Member',
        }),
      ),
    };
    const directory = new MongooseProjectUserDirectory(
      users as unknown as Model<UserEntity>,
    );

    await expect(directory.findActiveById('invalid')).resolves.toBeNull();
    await expect(directory.findActiveById(userId.toString())).resolves.toEqual({
      id: userId.toString(),
      email: 'member@example.com',
      displayName: 'Member',
    });
    expect(users.findOne).toHaveBeenCalledWith({
      _id: userId.toString(),
      status: 'active',
    });
  });

  it('escapes search text and applies a bounded active-user query', async () => {
    const findQuery = queryResult([
      {
        _id: userId,
        email: 'member@example.com',
        displayName: 'Member',
      },
    ]);
    const users = { find: jest.fn().mockReturnValue(findQuery) };
    const directory = new MongooseProjectUserDirectory(
      users as unknown as Model<UserEntity>,
    );

    await expect(directory.listActive('mem.*', 30)).resolves.toEqual([
      {
        id: userId.toString(),
        email: 'member@example.com',
        displayName: 'Member',
      },
    ]);
    expect(users.find).toHaveBeenCalledWith({
      status: 'active',
      $or: [
        { displayName: { $regex: 'mem\\.\\*', $options: 'i' } },
        { email: { $regex: 'mem\\.\\*', $options: 'i' } },
      ],
    });
    expect(findQuery.limit).toHaveBeenCalledWith(30);
  });

  it('returns null or an unfiltered directory when no user/search exists', async () => {
    const users = {
      findOne: jest.fn().mockReturnValue(queryResult(null)),
      find: jest.fn().mockReturnValue(queryResult([])),
    };
    const directory = new MongooseProjectUserDirectory(
      users as unknown as Model<UserEntity>,
    );

    await expect(
      directory.findActiveById(userId.toString()),
    ).resolves.toBeNull();
    await expect(directory.listActive(undefined, 10)).resolves.toEqual([]);
    expect(users.find).toHaveBeenCalledWith({ status: 'active' });
  });
});
