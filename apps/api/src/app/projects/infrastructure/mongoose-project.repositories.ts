import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type {
  ProjectDetail,
  ProjectMember,
  ProjectMembershipRole,
  ProjectStatus,
  UserStatus,
} from '@project-ql/api-contracts';
import { Connection, Model, PipelineStage, Types, UpdateQuery } from 'mongoose';
import { UserEntity } from '../../auth/infrastructure/auth.schemas';
import type {
  CreateProjectRecord,
  ListProjectsQuery,
  MembershipRemoveResult,
  MembershipWriteResult,
  ProjectRepository,
  ProjectUserDirectory,
  UpdateProjectRecord,
} from '../application/project-management.ports';
import { ProjectEntity, ProjectMembershipEntity } from './project.schemas';

interface LeanProject {
  _id: Types.ObjectId;
  code: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: Date;
  dueDate?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface MembershipStat {
  _id: Types.ObjectId;
  memberCount: number;
  myRole?: ProjectMembershipRole;
}

interface MemberAggregate {
  userId: Types.ObjectId;
  email: string;
  displayName: string;
  status: UserStatus;
  role: ProjectMembershipRole;
  joinedAt: Date;
}

@Injectable()
export class MongooseProjectRepository implements ProjectRepository {
  constructor(
    @InjectModel(ProjectEntity.name)
    private readonly projects: Model<ProjectEntity>,
    @InjectModel(ProjectMembershipEntity.name)
    private readonly memberships: Model<ProjectMembershipEntity>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async codeExists(code: string): Promise<boolean> {
    return Boolean(await this.projects.exists({ code }));
  }

  async createWithOwner(input: CreateProjectRecord): Promise<ProjectDetail> {
    const session = await this.connection.startSession();
    let createdProject: LeanProject | undefined;
    try {
      await session.withTransaction(async () => {
        const [project] = await this.projects.create(
          [
            {
              code: input.code,
              name: input.name,
              description: input.description,
              status: input.status,
              startDate: input.startDate,
              dueDate: input.dueDate,
              createdBy: new Types.ObjectId(input.createdBy),
            },
          ],
          { session },
        );
        await this.memberships.create(
          [
            {
              projectId: project._id,
              userId: new Types.ObjectId(input.ownerUserId),
              role: 'owner',
              createdBy: new Types.ObjectId(input.createdBy),
            },
          ],
          { session },
        );
        createdProject = project.toObject() as LeanProject;
      });
    } finally {
      await session.endSession();
    }
    if (!createdProject) throw new Error('Project transaction did not commit');
    return this.toProjectDetail(createdProject, 1, 'owner');
  }

  async list(
    query: ListProjectsQuery,
  ): Promise<{ projects: ProjectDetail[]; totalItems: number }> {
    const filter: {
      status?: ProjectStatus;
      _id?: { $in: Types.ObjectId[] };
    } = {
      ...(query.status ? { status: query.status } : {}),
    };
    if (!query.canManageAll) {
      const scopedMemberships = await this.memberships
        .find({ userId: new Types.ObjectId(query.actorId) })
        .select({ projectId: 1 })
        .lean()
        .exec();
      if (scopedMemberships.length === 0) {
        return { projects: [], totalItems: 0 };
      }
      filter._id = { $in: scopedMemberships.map(({ projectId }) => projectId) };
    }

    const [projectRows, totalItems] = await Promise.all([
      this.projects
        .find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .lean()
        .exec(),
      this.projects.countDocuments(filter).exec(),
    ]);
    if (projectRows.length === 0) return { projects: [], totalItems };

    const projectIds = projectRows.map(({ _id }) => _id);
    const actorId = new Types.ObjectId(query.actorId);
    const stats = await this.memberships.aggregate<MembershipStat>([
      { $match: { projectId: { $in: projectIds } } },
      {
        $group: {
          _id: '$projectId',
          memberCount: { $sum: 1 },
          myRole: {
            $max: {
              $cond: [{ $eq: ['$userId', actorId] }, '$role', null],
            },
          },
        },
      },
    ]);
    const statsByProject = new Map(
      stats.map((stat) => [stat._id.toString(), stat]),
    );
    return {
      projects: projectRows.map((project) => {
        const stat = statsByProject.get(project._id.toString());
        return this.toProjectDetail(
          project as LeanProject,
          stat?.memberCount ?? 0,
          stat?.myRole,
        );
      }),
      totalItems,
    };
  }

  async findByIdWithAccess(
    projectId: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<ProjectDetail | null> {
    if (!Types.ObjectId.isValid(projectId)) return null;
    const projectObjectId = new Types.ObjectId(projectId);
    const actorObjectId = new Types.ObjectId(actorId);
    const actorMembership = await this.memberships
      .findOne({ projectId: projectObjectId, userId: actorObjectId })
      .select({ role: 1 })
      .lean()
      .exec();
    if (!canManageAll && !actorMembership) return null;

    const [project, memberCount] = await Promise.all([
      this.projects.findById(projectObjectId).lean().exec(),
      this.memberships.countDocuments({ projectId: projectObjectId }).exec(),
    ]);
    return project
      ? this.toProjectDetail(
          project as LeanProject,
          memberCount,
          actorMembership?.role,
        )
      : null;
  }

  async update(
    projectId: string,
    input: UpdateProjectRecord,
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(projectId)) return false;
    const setFields: Record<string, unknown> = {};
    const unsetFields: Record<string, 1> = {};
    for (const [field, value] of Object.entries(input)) {
      if (value === null) {
        unsetFields[field] = 1;
      } else {
        setFields[field] = value;
      }
    }
    const update: UpdateQuery<ProjectEntity> = {
      $set: setFields,
      $unset: unsetFields,
    };
    const result = await this.projects
      .updateOne({ _id: projectId }, update, { runValidators: true })
      .exec();
    return result.matchedCount === 1;
  }

  listMembers(projectId: string): Promise<ProjectMember[]> {
    if (!Types.ObjectId.isValid(projectId)) return Promise.resolve([]);
    return this.memberships
      .aggregate<MemberAggregate>(this.memberAggregation(projectId))
      .then((members) => members.map((member) => this.toProjectMember(member)));
  }

  async upsertMemberSafely(input: {
    projectId: string;
    userId: string;
    role: ProjectMembershipRole;
    actorId: string;
  }): Promise<MembershipWriteResult> {
    const projectId = new Types.ObjectId(input.projectId);
    const userId = new Types.ObjectId(input.userId);
    const session = await this.connection.startSession();
    let result: MembershipWriteResult | undefined;
    try {
      await session.withTransaction(async () => {
        const existing = await this.memberships
          .findOne({ projectId, userId })
          .session(session)
          .lean()
          .exec();
        if (existing?.role === 'owner' && input.role !== 'owner') {
          const ownerCount = await this.memberships
            .countDocuments({ projectId, role: 'owner' })
            .session(session)
            .exec();
          if (ownerCount <= 1) {
            result = 'last_owner';
            return;
          }
        }
        await this.memberships.findOneAndUpdate(
          { projectId, userId },
          {
            $set: { role: input.role },
            $setOnInsert: {
              projectId,
              userId,
              createdBy: new Types.ObjectId(input.actorId),
            },
          },
          { upsert: true, session, runValidators: true },
        );
      });
    } finally {
      await session.endSession();
    }
    if (result === 'last_owner') return result;
    const member = await this.findMember(input.projectId, input.userId);
    if (!member) throw new Error('Project membership was not persisted');
    return member;
  }

  async removeMemberSafely(
    projectIdValue: string,
    userIdValue: string,
  ): Promise<MembershipRemoveResult> {
    if (
      !Types.ObjectId.isValid(projectIdValue) ||
      !Types.ObjectId.isValid(userIdValue)
    ) {
      return 'not_found';
    }
    const projectId = new Types.ObjectId(projectIdValue);
    const userId = new Types.ObjectId(userIdValue);
    const session = await this.connection.startSession();
    let result: MembershipRemoveResult = 'not_found';
    try {
      await session.withTransaction(async () => {
        const membership = await this.memberships
          .findOne({ projectId, userId })
          .session(session)
          .lean()
          .exec();
        if (!membership) return;
        if (membership.role === 'owner') {
          const ownerCount = await this.memberships
            .countDocuments({ projectId, role: 'owner' })
            .session(session)
            .exec();
          if (ownerCount <= 1) {
            result = 'last_owner';
            return;
          }
        }
        await this.memberships
          .deleteOne({ projectId, userId })
          .session(session);
        result = 'removed';
      });
    } finally {
      await session.endSession();
    }
    return result;
  }

  private async findMember(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember | null> {
    const [member] = await this.memberships.aggregate<MemberAggregate>([
      ...this.memberAggregation(projectId),
      { $match: { userId: new Types.ObjectId(userId) } },
      { $limit: 1 },
    ]);
    return member ? this.toProjectMember(member) : null;
  }

  private memberAggregation(projectId: string): PipelineStage[] {
    return [
      { $match: { projectId: new Types.ObjectId(projectId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $addFields: {
          roleRank: {
            $switch: {
              branches: [
                { case: { $eq: ['$role', 'owner'] }, then: 1 },
                { case: { $eq: ['$role', 'manager'] }, then: 2 },
              ],
              default: 3,
            },
          },
        },
      },
      { $sort: { roleRank: 1, createdAt: 1, _id: 1 } },
      {
        $project: {
          _id: 0,
          userId: 1,
          email: '$user.email',
          displayName: '$user.displayName',
          status: '$user.status',
          role: 1,
          joinedAt: '$createdAt',
        },
      },
    ];
  }

  private toProjectDetail(
    project: LeanProject,
    memberCount: number,
    myRole?: ProjectMembershipRole,
  ): ProjectDetail {
    return {
      id: project._id.toString(),
      code: project.code,
      name: project.name,
      ...(project.description ? { description: project.description } : {}),
      status: project.status,
      ...(project.startDate
        ? { startDate: project.startDate.toISOString() }
        : {}),
      ...(project.dueDate ? { dueDate: project.dueDate.toISOString() } : {}),
      memberCount,
      ...(myRole ? { myRole } : {}),
      createdBy: project.createdBy.toString(),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  private toProjectMember(member: MemberAggregate): ProjectMember {
    return {
      userId: member.userId.toString(),
      email: member.email,
      displayName: member.displayName,
      status: member.status,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    };
  }
}

@Injectable()
export class MongooseProjectUserDirectory implements ProjectUserDirectory {
  constructor(
    @InjectModel(UserEntity.name) private readonly users: Model<UserEntity>,
  ) {}

  async findActiveById(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return null;
    const user = await this.users
      .findOne({ _id: userId, status: 'active' })
      .select({ email: 1, displayName: 1 })
      .lean()
      .exec();
    return user
      ? {
          id: user._id.toString(),
          email: user.email,
          displayName: user.displayName,
        }
      : null;
  }

  async listActive(search: string | undefined, limit: number) {
    const escapedSearch = search?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = {
      status: 'active' as const,
      ...(escapedSearch
        ? {
            $or: [
              { displayName: { $regex: escapedSearch, $options: 'i' } },
              { email: { $regex: escapedSearch, $options: 'i' } },
            ],
          }
        : {}),
    };
    const users = await this.users
      .find(filter)
      .select({ email: 1, displayName: 1 })
      .sort({ displayName: 1, _id: 1 })
      .limit(limit)
      .lean()
      .exec();
    return users.map((user) => ({
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
    }));
  }
}
