import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { ProjectEntity } from '../../projects/infrastructure/project.schemas';
import {
  MongooseTaskProjectDirectory,
  MongooseTaskRepository,
} from './mongoose-task.repositories';
import type { TaskEntity } from './task.schemas';

function queryResult<T>(value: T) {
  const query = {
    sort: jest.fn(),
    lean: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };
  query.sort.mockReturnValue(query);
  query.lean.mockReturnValue(query);
  return query;
}

const projectId = new Types.ObjectId();
const actorId = new Types.ObjectId();
const taskId = new Types.ObjectId();
const taskRow = {
  _id: taskId,
  projectId,
  projectCode: 'IDS',
  projectName: 'IDS PMS',
  step: 1,
  name: 'Hồ sơ thiết kế phê duyệt',
  department: 'P.KTDA',
  status: 'todo' as const,
  updatedAt: new Date('2026-08-10T00:00:00.000Z'),
};

describe('MongooseTaskRepository', () => {
  it('lists scoped tasks and overview through one aggregate instead of N+1 queries', async () => {
    const tasks = {
      aggregate: jest.fn().mockResolvedValue([
        {
          data: [taskRow],
          total: [{ value: 1 }],
          overview: [
            {
              totalTasks: 1,
              completedTasks: 0,
              tasksWithActualEnd: 0,
              trackedProjects: 1,
            },
          ],
        },
      ]),
    };
    const repository = new MongooseTaskRepository(
      tasks as unknown as Model<TaskEntity>,
    );

    const result = await repository.list({
      actorId: actorId.toString(),
      canManageAll: false,
      page: 1,
      skip: 0,
      limit: 20,
      status: 'todo',
    });

    expect(tasks.aggregate).toHaveBeenCalledTimes(1);
    const pipeline = tasks.aggregate.mock.calls[0][0];
    expect(pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ $lookup: expect.objectContaining({ from: 'projects' }) }),
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'project_memberships' }),
        }),
        expect.objectContaining({ $facet: expect.any(Object) }),
      ]),
    );
    expect(result).toEqual({
      tasks: [
        expect.objectContaining({
          id: taskId.toString(),
          projectCode: 'IDS',
          updatedAt: '2026-08-10T00:00:00.000Z',
        }),
      ],
      totalItems: 1,
      overview: {
        totalTasks: 1,
        completedTasks: 0,
        tasksWithActualEnd: 0,
        trackedProjects: 1,
      },
    });
  });

  it('does not add membership lookup for globally manageable task lists', async () => {
    const tasks = { aggregate: jest.fn().mockResolvedValue([]) };
    const repository = new MongooseTaskRepository(
      tasks as unknown as Model<TaskEntity>,
    );

    await repository.list({
      actorId: actorId.toString(),
      canManageAll: true,
      page: 1,
      skip: 0,
      limit: 20,
    });

    const pipeline = tasks.aggregate.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(
      pipeline.filter((stage) => '$lookup' in stage).map((stage) => stage.$lookup),
    ).toEqual([expect.objectContaining({ from: 'projects' })]);
  });

  it('initializes only missing standard steps with idempotent upserts', async () => {
    const findQuery = queryResult([taskRow]);
    const tasks = {
      bulkWrite: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockReturnValue(findQuery),
    };
    const repository = new MongooseTaskRepository(
      tasks as unknown as Model<TaskEntity>,
    );

    const result = await repository.initializePlan(
      { id: projectId.toString(), code: 'IDS', name: 'IDS PMS' },
      [
        { step: 1, name: taskRow.name, department: 'P.KTDA' },
        { step: 2, name: 'Chuẩn bị vật tư', department: 'P.KTDA' },
      ],
      actorId.toString(),
    );

    expect(tasks.bulkWrite).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          updateOne: expect.objectContaining({ upsert: true }),
        }),
        expect.objectContaining({
          updateOne: expect.objectContaining({ upsert: true }),
        }),
      ],
      { ordered: false },
    );
    expect(findQuery.sort).toHaveBeenCalledWith({ step: 1 });
    expect(result[0]).toMatchObject({ projectName: 'IDS PMS', step: 1 });
  });

  it('loads one accessible task through the same project join pipeline', async () => {
    const tasks = { aggregate: jest.fn().mockResolvedValue([taskRow]) };
    const repository = new MongooseTaskRepository(
      tasks as unknown as Model<TaskEntity>,
    );

    await expect(
      repository.findByIdWithAccess(
        taskId.toString(),
        actorId.toString(),
        false,
      ),
    ).resolves.toMatchObject({
      id: taskId.toString(),
      projectId: projectId.toString(),
      projectName: 'IDS PMS',
    });
    const pipeline = tasks.aggregate.mock.calls[0][0];
    expect(pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'project_memberships' }),
        }),
      ]),
    );
  });

  it('returns null for invalid or inaccessible task ids', async () => {
    const tasks = { aggregate: jest.fn().mockResolvedValue([]) };
    const repository = new MongooseTaskRepository(
      tasks as unknown as Model<TaskEntity>,
    );

    await expect(
      repository.findByIdWithAccess('invalid', actorId.toString(), false),
    ).resolves.toBeNull();
    await expect(
      repository.findByIdWithAccess(
        taskId.toString(),
        actorId.toString(),
        false,
      ),
    ).resolves.toBeNull();
    expect(tasks.aggregate).toHaveBeenCalledTimes(1);
  });

  it('updates nullable fields in one atomic write', async () => {
    const updateQuery = queryResult({ ...taskRow, status: 'done', actualEndDate: new Date('2026-08-11') });
    const tasks = { findOneAndUpdate: jest.fn().mockReturnValue(updateQuery) };
    const repository = new MongooseTaskRepository(
      tasks as unknown as Model<TaskEntity>,
    );

    await repository.update(
      {
        id: taskId.toString(),
        projectId: projectId.toString(),
        projectCode: 'IDS',
        projectName: 'IDS PMS',
        step: 1,
        name: taskRow.name,
        department: 'P.KTDA',
        status: 'todo',
        updatedAt: taskRow.updatedAt.toISOString(),
      },
      {
        status: 'done',
        actualEndDate: new Date('2026-08-11'),
        plannedEndDate: null,
        updatedBy: actorId.toString(),
      },
    );

    expect(tasks.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: taskId },
      {
        $set: expect.objectContaining({
          status: 'done',
          actualEndDate: new Date('2026-08-11'),
          updatedBy: expect.any(Types.ObjectId),
        }),
        $unset: { plannedEndDate: 1 },
      },
      { returnDocument: 'after', runValidators: true },
    );
  });
});

describe('MongooseTaskProjectDirectory', () => {
  it('resolves project access and membership role in one aggregate', async () => {
    const projects = {
      aggregate: jest.fn().mockResolvedValue([
        {
          _id: projectId,
          code: 'IDS',
          name: 'IDS PMS',
          myRole: 'manager',
        },
      ]),
    };
    const directory = new MongooseTaskProjectDirectory(
      projects as unknown as Model<ProjectEntity>,
    );

    await expect(
      directory.findByIdWithAccess(
        projectId.toString(),
        actorId.toString(),
        false,
      ),
    ).resolves.toEqual({
      id: projectId.toString(),
      code: 'IDS',
      name: 'IDS PMS',
      myRole: 'manager',
    });
    expect(projects.aggregate).toHaveBeenCalledTimes(1);
  });

  it('returns null without querying for an invalid project id', async () => {
    const projects = { aggregate: jest.fn() };
    const directory = new MongooseTaskProjectDirectory(
      projects as unknown as Model<ProjectEntity>,
    );

    await expect(
      directory.findByIdWithAccess('invalid', actorId.toString(), false),
    ).resolves.toBeNull();
    expect(projects.aggregate).not.toHaveBeenCalled();
  });
});
