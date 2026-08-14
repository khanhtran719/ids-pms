import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { ProjectEntity } from '../../projects/infrastructure/project.schemas';
import type { ProjectActivityEntity } from './project-activity.schemas';
import { MongooseProjectActivityRepository } from './mongoose-project-activity.repository';

const projectId = new Types.ObjectId();
const actorId = new Types.ObjectId();
const activityId = new Types.ObjectId();

describe('MongooseProjectActivityRepository', () => {
  it('scopes and paginates a project timeline in one aggregation', async () => {
    const projects = {
      aggregate: jest.fn().mockResolvedValue([
        {
          activityReport: [
            {
              data: [
                {
                  _id: activityId,
                  projectId,
                  type: 'comment',
                  content: 'Đã xác nhận mặt bằng thi công.',
                  authorId: actorId,
                  authorDisplayName: 'Nguyễn An',
                  authorEmail: 'an@example.com',
                  createdAt: new Date('2026-08-14T05:00:00.000Z'),
                },
              ],
              total: [{ value: 1 }],
            },
          ],
        },
      ]),
    };
    const activities = { create: jest.fn() };
    const repository = new MongooseProjectActivityRepository(
      projects as unknown as Model<ProjectEntity>,
      activities as unknown as Model<ProjectActivityEntity>,
    );

    const result = await repository.list({
      projectId: projectId.toString(),
      actorId: actorId.toString(),
      canManageAll: false,
      page: 1,
      limit: 20,
      skip: 0,
    });

    expect(projects.aggregate).toHaveBeenCalledTimes(1);
    const pipeline = projects.aggregate.mock.calls[0][0];
    expect(pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'project_memberships' }),
        }),
        expect.objectContaining({
          $lookup: expect.objectContaining({
            from: 'project_activities',
            pipeline: expect.arrayContaining([
              expect.objectContaining({ $facet: expect.any(Object) }),
            ]),
          }),
        }),
      ]),
    );
    expect(result).toEqual({
      activities: [
        {
          id: activityId.toString(),
          projectId: projectId.toString(),
          type: 'comment',
          content: 'Đã xác nhận mặt bằng thi công.',
          authorId: actorId.toString(),
          authorDisplayName: 'Nguyễn An',
          authorEmail: 'an@example.com',
          createdAt: '2026-08-14T05:00:00.000Z',
        },
      ],
      totalItems: 1,
    });
  });

  it('skips membership lookup for global managers and returns a stable empty timeline', async () => {
    const projects = {
      aggregate: jest.fn().mockResolvedValue([{ activityReport: [] }]),
    };
    const repository = new MongooseProjectActivityRepository(
      projects as unknown as Model<ProjectEntity>,
      { create: jest.fn() } as unknown as Model<ProjectActivityEntity>,
    );

    const result = await repository.list({
      projectId: projectId.toString(),
      actorId: actorId.toString(),
      canManageAll: true,
      page: 1,
      limit: 20,
      skip: 0,
    });

    expect(JSON.stringify(projects.aggregate.mock.calls[0][0])).not.toContain(
      'project_memberships',
    );
    expect(result).toEqual({ activities: [], totalItems: 0 });
  });

  it('returns null when the project does not exist or is outside scope', async () => {
    const projects = { aggregate: jest.fn().mockResolvedValue([]) };
    const repository = new MongooseProjectActivityRepository(
      projects as unknown as Model<ProjectEntity>,
      { create: jest.fn() } as unknown as Model<ProjectActivityEntity>,
    );

    await expect(
      repository.list({
        projectId: projectId.toString(),
        actorId: actorId.toString(),
        canManageAll: false,
        page: 1,
        limit: 20,
        skip: 0,
      }),
    ).resolves.toBeNull();
  });

  it('resolves author/project access and persists an immutable comment', async () => {
    const projects = {
      aggregate: jest.fn().mockResolvedValue([
        {
          _id: projectId,
          author: [
            {
              _id: actorId,
              displayName: 'Nguyễn An',
              email: 'an@example.com',
            },
          ],
        },
      ]),
    };
    const activities = {
      create: jest.fn().mockResolvedValue({
        _id: activityId,
        projectId,
        type: 'comment',
        content: 'Nội dung',
        authorId: actorId,
        authorDisplayName: 'Nguyễn An',
        authorEmail: 'an@example.com',
        createdAt: new Date('2026-08-14T05:00:00.000Z'),
      }),
    };
    const repository = new MongooseProjectActivityRepository(
      projects as unknown as Model<ProjectEntity>,
      activities as unknown as Model<ProjectActivityEntity>,
    );

    const context = await repository.resolveCreateContext(
      projectId.toString(),
      actorId.toString(),
      false,
    );
    expect(context).not.toBeNull();
    if (!context) throw new Error('Expected an accessible create context');
    const created = await repository.create({
      ...context,
      type: 'comment',
      content: 'Nội dung',
    });

    expect(JSON.stringify(projects.aggregate.mock.calls[0][0])).toContain(
      'users',
    );
    expect(activities.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        authorId: actorId,
        authorDisplayName: 'Nguyễn An',
      }),
    );
    expect(created.id).toBe(activityId.toString());
  });

  it('does not create an activity when the author context is missing', async () => {
    const projects = {
      aggregate: jest.fn().mockResolvedValue([{ _id: projectId, author: [] }]),
    };
    const repository = new MongooseProjectActivityRepository(
      projects as unknown as Model<ProjectEntity>,
      { create: jest.fn() } as unknown as Model<ProjectActivityEntity>,
    );

    await expect(
      repository.resolveCreateContext(
        projectId.toString(),
        actorId.toString(),
        true,
      ),
    ).resolves.toBeNull();
  });
});
