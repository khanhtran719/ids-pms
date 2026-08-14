import { NotFoundException } from '@nestjs/common';
import type { ProjectActivity } from '@project-ql/api-contracts';
import type { ProjectActivityRepository } from './project-activity.ports';
import { ProjectActivityService } from './project-activity.service';

const ACTIVITY: ProjectActivity = {
  id: 'activity-1',
  projectId: 'project-1',
  type: 'comment',
  content: 'Đã xác nhận mặt bằng thi công.',
  authorId: 'user-1',
  authorDisplayName: 'Nguyễn An',
  authorEmail: 'an@example.com',
  createdAt: '2026-08-14T05:00:00.000Z',
};

describe('ProjectActivityService', () => {
  it('returns one accessible paginated project timeline', async () => {
    const repository: jest.Mocked<ProjectActivityRepository> = {
      list: jest.fn().mockResolvedValue({
        activities: [ACTIVITY],
        totalItems: 1,
      }),
      resolveCreateContext: jest.fn(),
      create: jest.fn(),
    };
    const service = new ProjectActivityService(repository);

    const result = await service.list(
      'project-1',
      'user-1',
      ['projects.read'],
      2,
      20,
    );

    expect(repository.list).toHaveBeenCalledWith({
      projectId: 'project-1',
      actorId: 'user-1',
      canManageAll: false,
      page: 2,
      limit: 20,
      skip: 20,
    });
    expect(result).toEqual({
      data: [ACTIVITY],
      meta: {
        page: 2,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    });
  });

  it('trims and creates a comment with the authenticated author snapshot', async () => {
    const repository: jest.Mocked<ProjectActivityRepository> = {
      list: jest.fn(),
      resolveCreateContext: jest.fn().mockResolvedValue({
        projectId: 'project-1',
        authorId: 'admin-1',
        authorDisplayName: 'Administrator',
        authorEmail: 'admin@example.com',
      }),
      create: jest.fn().mockResolvedValue(ACTIVITY),
    };
    const service = new ProjectActivityService(repository);

    const result = await service.createComment(
      'project-1',
      'admin-1',
      ['projects.read', 'projects.manage'],
      { content: '  Đã xác nhận mặt bằng thi công.  ' },
    );

    expect(repository.resolveCreateContext).toHaveBeenCalledWith(
      'project-1',
      'admin-1',
      true,
    );
    expect(repository.create).toHaveBeenCalledWith({
      projectId: 'project-1',
      type: 'comment',
      content: 'Đã xác nhận mặt bằng thi công.',
      authorId: 'admin-1',
      authorDisplayName: 'Administrator',
      authorEmail: 'admin@example.com',
    });
    expect(result).toEqual(ACTIVITY);
  });

  it('uses the same not-found response when the project is missing or inaccessible', async () => {
    const repository: jest.Mocked<ProjectActivityRepository> = {
      list: jest.fn().mockResolvedValue(null),
      resolveCreateContext: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };
    const service = new ProjectActivityService(repository);

    await expect(
      service.list('project-1', 'user-1', ['projects.read'], 1, 20),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.createComment('project-1', 'user-1', ['projects.read'], {
        content: 'Nội dung',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PROJECT_ACTIVITY_NOT_FOUND' }),
    });
    expect(repository.create).not.toHaveBeenCalled();
  });
});
