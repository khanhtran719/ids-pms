import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type {
  PermissionCode,
  ProjectDetail,
  ProjectMember,
} from '@project-ql/api-contracts';
import type {
  ProjectRepository,
  ProjectUserDirectory,
} from './project-management.ports';
import { ProjectManagementService } from './project-management.service';

const PROJECT: ProjectDetail = {
  id: 'project-1',
  code: 'IDS',
  name: 'IDS PMS',
  description: 'Internal project management',
  status: 'planning',
  memberCount: 1,
  myRole: 'owner',
  createdBy: 'user-1',
  createdAt: '2026-08-10T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
};

describe('ProjectManagementService', () => {
  let projects: jest.Mocked<ProjectRepository>;
  let users: jest.Mocked<ProjectUserDirectory>;
  let service: ProjectManagementService;

  beforeEach(() => {
    projects = {
      codeExists: jest.fn().mockResolvedValue(false),
      createWithOwner: jest.fn().mockResolvedValue(PROJECT),
      list: jest.fn().mockResolvedValue({ projects: [PROJECT], totalItems: 1 }),
      findByIdWithAccess: jest.fn().mockResolvedValue(PROJECT),
      update: jest.fn().mockResolvedValue(true),
      listMembers: jest.fn().mockResolvedValue([]),
      upsertMemberSafely: jest.fn().mockResolvedValue('updated'),
      removeMemberSafely: jest.fn().mockResolvedValue('removed'),
    };
    users = {
      findActiveById: jest.fn().mockResolvedValue({
        id: 'user-2',
        email: 'member@example.com',
        displayName: 'Member',
      }),
      listActive: jest.fn().mockResolvedValue([
        {
          id: 'user-2',
          email: 'member@example.com',
          displayName: 'Member',
        },
      ]),
    };
    service = new ProjectManagementService(projects, users);
  });

  it('normalizes project input and creates the owner membership atomically', async () => {
    await service.create('user-1', {
      code: '  ids ',
      name: '  IDS PMS  ',
      description: '  Internal project management  ',
      startDate: '2026-08-10',
      dueDate: '2026-09-10',
    });

    expect(projects.createWithOwner).toHaveBeenCalledWith({
      code: 'IDS',
      name: 'IDS PMS',
      description: 'Internal project management',
      status: 'planning',
      startDate: new Date('2026-08-10'),
      dueDate: new Date('2026-09-10'),
      createdBy: 'user-1',
      ownerUserId: 'user-1',
    });
  });

  it('rejects a due date earlier than the start date', async () => {
    await expect(
      service.create('user-1', {
        code: 'IDS',
        name: 'IDS PMS',
        startDate: '2026-09-10',
        dueDate: '2026-08-10',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a duplicate normalized project code', async () => {
    projects.codeExists.mockResolvedValue(true);

    await expect(
      service.create('user-1', { code: ' ids ', name: 'IDS PMS' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('limits regular users to memberships but lets system managers list all', async () => {
    await service.list('user-1', ['projects.read'], 1, 20, undefined);
    await service.list(
      'user-1',
      ['projects.read', 'projects.manage'],
      1,
      20,
      'active',
    );

    expect(projects.list).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ actorId: 'user-1', canManageAll: false }),
    );
    expect(projects.list).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        actorId: 'user-1',
        canManageAll: true,
        status: 'active',
      }),
    );
  });

  it('allows a project manager to update their project', async () => {
    projects.findByIdWithAccess.mockResolvedValue({
      ...PROJECT,
      myRole: 'manager',
    });

    await service.update('project-1', 'user-1', ['projects.read'], {
      name: '  Updated project  ',
    });

    expect(projects.update).toHaveBeenCalledWith('project-1', {
      name: 'Updated project',
    });
  });

  it('denies project members from changing project settings', async () => {
    projects.findByIdWithAccess.mockResolvedValue({
      ...PROJECT,
      myRole: 'member',
    });

    await expect(
      service.update('project-1', 'user-1', ['projects.read'], {
        name: 'Not allowed',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns not found when a project is outside the actor scope', async () => {
    projects.findByIdWithAccess.mockResolvedValue(null);

    await expect(
      service.getById('missing', 'user-1', ['projects.read']),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('validates an active user before adding a project member', async () => {
    const member: ProjectMember = {
      userId: 'user-2',
      email: 'member@example.com',
      displayName: 'Member',
      status: 'active',
      role: 'member',
      joinedAt: '2026-08-10T00:00:00.000Z',
    };
    projects.upsertMemberSafely.mockResolvedValue(member);

    const result = await service.upsertMember(
      'project-1',
      'user-1',
      ['projects.read'],
      { userId: 'user-2', role: 'member' },
    );

    expect(users.findActiveById).toHaveBeenCalledWith('user-2');
    expect(result).toEqual(member);
  });

  it('lists active member candidates only for project managers', async () => {
    const result = await service.listMemberCandidates(
      'project-1',
      'user-1',
      ['projects.read'],
      ' mem ',
      20,
    );

    expect(users.listActive).toHaveBeenCalledWith('mem', 20);
    expect(result).toEqual([
      {
        userId: 'user-2',
        email: 'member@example.com',
        displayName: 'Member',
      },
    ]);

    projects.findByIdWithAccess.mockResolvedValue({
      ...PROJECT,
      myRole: 'member',
    });
    await expect(
      service.listMemberCandidates(
        'project-1',
        'user-1',
        ['projects.read'],
        undefined,
        20,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('preserves the final owner when changing or removing memberships', async () => {
    projects.upsertMemberSafely.mockResolvedValue('last_owner');
    projects.removeMemberSafely.mockResolvedValue('last_owner');
    const permissions: PermissionCode[] = ['projects.manage'];

    await expect(
      service.upsertMember('project-1', 'admin-1', permissions, {
        userId: 'owner-1',
        role: 'member',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.removeMember('project-1', 'owner-1', 'admin-1', permissions),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
