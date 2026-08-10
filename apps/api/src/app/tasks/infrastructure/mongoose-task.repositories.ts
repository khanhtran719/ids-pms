import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  ProjectMembershipRole,
  ProjectTask,
  TaskOverview,
  TaskStatus,
} from '@project-ql/api-contracts';
import { Model, PipelineStage, Types, UpdateQuery } from 'mongoose';
import { ProjectEntity } from '../../projects/infrastructure/project.schemas';
import type {
  ListTasksQuery,
  TaskProjectAccess,
  TaskProjectDirectory,
  TaskRepository,
  TaskTemplate,
  UpdateTaskRecord,
} from '../application/task-management.ports';
import { TaskEntity } from './task.schemas';

interface LeanTask {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  projectCode: string;
  projectName: string;
  step: number;
  name: string;
  department: string;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualEndDate?: Date;
  status: TaskStatus;
  updatedAt: Date;
}

interface TaskFacetResult {
  data: LeanTask[];
  total: Array<{ value: number }>;
  overview: TaskOverview[];
}

interface ProjectAccessRow {
  _id: Types.ObjectId;
  code: string;
  name: string;
  myRole?: ProjectMembershipRole;
}

const EMPTY_OVERVIEW: TaskOverview = {
  totalTasks: 0,
  completedTasks: 0,
  tasksWithActualEnd: 0,
  trackedProjects: 0,
};

@Injectable()
export class MongooseTaskRepository implements TaskRepository {
  constructor(
    @InjectModel(TaskEntity.name)
    private readonly tasks: Model<TaskEntity>,
  ) {}

  async list(query: ListTasksQuery): Promise<{
    tasks: ProjectTask[];
    totalItems: number;
    overview: TaskOverview;
  }> {
    if (query.projectId && !Types.ObjectId.isValid(query.projectId)) {
      return { tasks: [], totalItems: 0, overview: EMPTY_OVERVIEW };
    }
    const match: Record<string, unknown> = {
      ...(query.projectId
        ? { projectId: new Types.ObjectId(query.projectId) }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const pipeline: PipelineStage[] = [
      { $match: match },
      ...this.projectJoinStages(query.actorId, query.canManageAll),
      {
        $facet: {
          data: [
            { $sort: { projectName: 1, step: 1, _id: 1 } },
            { $skip: query.skip },
            { $limit: query.limit },
          ],
          total: [{ $count: 'value' }],
          overview: [
            {
              $group: {
                _id: null,
                totalTasks: { $sum: 1 },
                completedTasks: {
                  $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] },
                },
                tasksWithActualEnd: {
                  $sum: {
                    $cond: [
                      { $ne: [{ $ifNull: ['$actualEndDate', null] }, null] },
                      1,
                      0,
                    ],
                  },
                },
                projectIds: { $addToSet: '$projectId' },
              },
            },
            {
              $project: {
                _id: 0,
                totalTasks: 1,
                completedTasks: 1,
                tasksWithActualEnd: 1,
                trackedProjects: { $size: '$projectIds' },
              },
            },
          ],
        },
      },
    ];
    const [result] = await this.tasks.aggregate<TaskFacetResult>(pipeline);
    return {
      tasks: (result?.data ?? []).map((task) => this.toProjectTask(task)),
      totalItems: result?.total[0]?.value ?? 0,
      overview: result?.overview[0] ?? EMPTY_OVERVIEW,
    };
  }

  async initializePlan(
    project: TaskProjectAccess,
    templates: readonly TaskTemplate[],
    actorId: string,
  ): Promise<ProjectTask[]> {
    const projectObjectId = new Types.ObjectId(project.id);
    const actorObjectId = new Types.ObjectId(actorId);
    await this.tasks.bulkWrite(
      templates.map((template) => ({
        updateOne: {
          filter: { projectId: projectObjectId, step: template.step },
          update: {
            $setOnInsert: {
              projectId: projectObjectId,
              step: template.step,
              name: template.name,
              department: template.department,
              status: 'todo',
              createdBy: actorObjectId,
              updatedBy: actorObjectId,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    const rows = await this.tasks
      .find({ projectId: projectObjectId })
      .sort({ step: 1 })
      .lean()
      .exec();
    return rows.map((row) =>
      this.toProjectTask({
        ...(row as unknown as Omit<LeanTask, 'projectCode' | 'projectName'>),
        projectCode: project.code,
        projectName: project.name,
      }),
    );
  }

  async findByIdWithAccess(
    taskId: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<ProjectTask | null> {
    if (!Types.ObjectId.isValid(taskId)) return null;
    const [task] = await this.tasks.aggregate<LeanTask>([
      { $match: { _id: new Types.ObjectId(taskId) } },
      ...this.projectJoinStages(actorId, canManageAll),
      { $limit: 1 },
    ]);
    return task ? this.toProjectTask(task) : null;
  }

  async update(
    task: ProjectTask,
    input: UpdateTaskRecord,
  ): Promise<ProjectTask | null> {
    const setFields: Record<string, unknown> = {};
    const unsetFields: Record<string, 1> = {};
    for (const [field, value] of Object.entries(input)) {
      if (value === null) unsetFields[field] = 1;
      else if (field === 'updatedBy') setFields[field] = new Types.ObjectId(value as string);
      else setFields[field] = value;
    }
    const update: UpdateQuery<TaskEntity> = {
      $set: setFields,
      $unset: unsetFields,
    };
    const updated = await this.tasks
      .findOneAndUpdate({ _id: new Types.ObjectId(task.id) }, update, {
        returnDocument: 'after',
        runValidators: true,
      })
      .lean()
      .exec();
    if (!updated) return null;
    return this.toProjectTask({
      ...(updated as unknown as Omit<LeanTask, 'projectCode' | 'projectName'>),
      projectCode: task.projectCode,
      projectName: task.projectName,
    });
  }

  private projectJoinStages(
    actorId: string,
    canManageAll: boolean,
  ): PipelineStage[] {
    const stages: PipelineStage[] = [
      {
        $lookup: {
          from: 'projects',
          localField: 'projectId',
          foreignField: '_id',
          as: 'project',
        },
      },
      { $unwind: '$project' },
      {
        $set: {
          projectCode: '$project.code',
          projectName: '$project.name',
        },
      },
      { $unset: 'project' },
    ];
    if (!canManageAll) {
      stages.push(
        {
          $lookup: {
            from: 'project_memberships',
            let: { scopedProjectId: '$projectId' },
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
      );
    }
    return stages;
  }

  private toProjectTask(task: LeanTask): ProjectTask {
    return {
      id: task._id.toString(),
      projectId: task.projectId.toString(),
      projectCode: task.projectCode,
      projectName: task.projectName,
      step: task.step,
      name: task.name,
      department: task.department,
      ...(task.plannedStartDate
        ? { plannedStartDate: task.plannedStartDate.toISOString() }
        : {}),
      ...(task.plannedEndDate
        ? { plannedEndDate: task.plannedEndDate.toISOString() }
        : {}),
      ...(task.actualEndDate
        ? { actualEndDate: task.actualEndDate.toISOString() }
        : {}),
      status: task.status,
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}

@Injectable()
export class MongooseTaskProjectDirectory implements TaskProjectDirectory {
  constructor(
    @InjectModel(ProjectEntity.name)
    private readonly projects: Model<ProjectEntity>,
  ) {}

  async findByIdWithAccess(
    projectId: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<TaskProjectAccess | null> {
    if (!Types.ObjectId.isValid(projectId)) return null;
    const pipeline: PipelineStage[] = [
      { $match: { _id: new Types.ObjectId(projectId) } },
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
            { $project: { _id: 0, role: 1 } },
            { $limit: 1 },
          ],
          as: 'actorMembership',
        },
      },
      ...(canManageAll
        ? []
        : ([{ $match: { 'actorMembership.0': { $exists: true } } }] as PipelineStage[])),
      {
        $project: {
          code: 1,
          name: 1,
          myRole: { $arrayElemAt: ['$actorMembership.role', 0] },
        },
      },
      { $limit: 1 },
    ];
    const [project] = await this.projects.aggregate<ProjectAccessRow>(pipeline);
    return project
      ? {
          id: project._id.toString(),
          code: project.code,
          name: project.name,
          ...(project.myRole ? { myRole: project.myRole } : {}),
        }
      : null;
  }
}
