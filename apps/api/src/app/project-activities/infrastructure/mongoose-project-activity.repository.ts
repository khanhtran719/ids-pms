import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  ProjectActivity,
  ProjectActivityType,
} from '@project-ql/api-contracts';
import { Model, PipelineStage, Types } from 'mongoose';
import { ProjectEntity } from '../../projects/infrastructure/project.schemas';
import type {
  CreateProjectActivityRecord,
  ProjectActivityCreateContext,
  ProjectActivityListQuery,
  ProjectActivityRepository,
} from '../application/project-activity.ports';
import { ProjectActivityEntity } from './project-activity.schemas';

interface ActivityRow {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  type: ProjectActivityType;
  content: string;
  authorId: Types.ObjectId;
  authorDisplayName: string;
  authorEmail: string;
  createdAt: Date;
}

interface ActivityFacet {
  data: ActivityRow[];
  total: Array<{ value: number }>;
}

interface TimelineRow {
  activityReport: ActivityFacet[];
}

interface CreateContextRow {
  _id: Types.ObjectId;
  author: Array<{
    _id: Types.ObjectId;
    displayName: string;
    email: string;
  }>;
}

@Injectable()
export class MongooseProjectActivityRepository
  implements ProjectActivityRepository
{
  constructor(
    @InjectModel(ProjectEntity.name)
    private readonly projects: Model<ProjectEntity>,
    @InjectModel(ProjectActivityEntity.name)
    private readonly activities: Model<ProjectActivityEntity>,
  ) {}

  async list(query: ProjectActivityListQuery) {
    const [project] = await this.projects.aggregate<TimelineRow>([
      { $match: { _id: new Types.ObjectId(query.projectId) } },
      ...this.accessStages(query.actorId, query.canManageAll),
      {
        $lookup: {
          from: 'project_activities',
          let: { scopedProjectId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$projectId', '$$scopedProjectId'] },
              },
            },
            {
              $facet: {
                data: [
                  { $sort: { createdAt: -1, _id: -1 } },
                  { $skip: query.skip },
                  { $limit: query.limit },
                  {
                    $project: {
                      projectId: 1,
                      type: 1,
                      content: 1,
                      authorId: 1,
                      authorDisplayName: 1,
                      authorEmail: 1,
                      createdAt: 1,
                    },
                  },
                ],
                total: [{ $count: 'value' }],
              },
            },
          ],
          as: 'activityReport',
        },
      },
      { $project: { activityReport: 1 } },
      { $limit: 1 },
    ]);
    if (!project) return null;
    const report = project.activityReport[0];
    return {
      activities: (report?.data ?? []).map((row) => this.map(row)),
      totalItems: report?.total[0]?.value ?? 0,
    };
  }

  async resolveCreateContext(
    projectId: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<ProjectActivityCreateContext | null> {
    const [project] = await this.projects.aggregate<CreateContextRow>([
      { $match: { _id: new Types.ObjectId(projectId) } },
      ...this.accessStages(actorId, canManageAll),
      {
        $lookup: {
          from: 'users',
          let: { authorId: new Types.ObjectId(actorId) },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$authorId'] },
              },
            },
            { $project: { displayName: 1, email: 1 } },
            { $limit: 1 },
          ],
          as: 'author',
        },
      },
      { $match: { 'author.0': { $exists: true } } },
      { $project: { author: 1 } },
      { $limit: 1 },
    ]);
    const author = project?.author[0];
    if (!project || !author) return null;
    return {
      projectId: project._id.toString(),
      authorId: author._id.toString(),
      authorDisplayName: author.displayName,
      authorEmail: author.email,
    };
  }

  async create(input: CreateProjectActivityRecord): Promise<ProjectActivity> {
    const created = await this.activities.create({
      ...input,
      projectId: new Types.ObjectId(input.projectId),
      authorId: new Types.ObjectId(input.authorId),
    });
    return this.map(created as unknown as ActivityRow);
  }

  private accessStages(
    actorId: string,
    canManageAll: boolean,
  ): PipelineStage[] {
    if (canManageAll) return [];
    return [
      {
        $lookup: {
          from: 'project_memberships',
          let: { scopedProjectId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$projectId', '$$scopedProjectId'] },
                    { $eq: ['$userId', new Types.ObjectId(actorId)] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: 'actorMembership',
        },
      },
      { $match: { 'actorMembership.0': { $exists: true } } },
      { $unset: 'actorMembership' },
    ];
  }

  private map(row: ActivityRow): ProjectActivity {
    return {
      id: row._id.toString(),
      projectId: row.projectId.toString(),
      type: row.type,
      content: row.content,
      authorId: row.authorId.toString(),
      authorDisplayName: row.authorDisplayName,
      authorEmail: row.authorEmail,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
