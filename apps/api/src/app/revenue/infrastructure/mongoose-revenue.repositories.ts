import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  FiscalQuarter,
  RevenueActual,
  RevenueOverview,
  RevenueProjectSummary,
  RevenueQuarterSummary,
} from '@project-ql/api-contracts';
import { Model, PipelineStage, Types } from 'mongoose';
import { ProjectEntity } from '../../projects/infrastructure/project.schemas';
import type {
  ListRevenueQuery,
  RevenueActualRepository,
  RevenueProjectAccess,
  RevenueProjectDirectory,
  UpsertRevenueActualRecord,
} from '../application/revenue-management.ports';
import { RevenueActualEntity } from './revenue-actual.schemas';

interface ActualValue {
  quarter: FiscalQuarter;
  revenue: number;
  cost: number;
}

interface ProjectRevenueRow {
  _id: Types.ObjectId;
  code: string;
  name: string;
  quarters: ActualValue[];
  revenueTotal: number;
  costTotal: number;
}

interface RevenueFacet {
  data: ProjectRevenueRow[];
  total: Array<{ value: number }>;
  overview: Array<{
    totalProjects: number;
    projectsWithRevenue: number;
    totalRevenue: number;
    totalCost: number;
  }>;
  quarters: Array<{
    _id: FiscalQuarter;
    revenue: number;
    cost: number;
  }>;
}

interface RevenueActualRow {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  fiscalYear: number;
  quarter: FiscalQuarter;
  revenue: number;
  cost: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MongooseRevenueActualRepository
  implements RevenueActualRepository
{
  constructor(
    @InjectModel(RevenueActualEntity.name)
    private readonly actuals: Model<RevenueActualEntity>,
    @InjectModel(ProjectEntity.name)
    private readonly projects: Model<ProjectEntity>,
  ) {}

  async getReport(query: ListRevenueQuery): Promise<{
    projects: RevenueProjectSummary[];
    totalItems: number;
    overview: RevenueOverview;
    quarters: RevenueQuarterSummary[];
  }> {
    const searchMatch = this.searchMatch(query.search);
    const pipeline: PipelineStage[] = [
      ...this.accessStages(query.actorId, query.canManageAll),
      {
        $lookup: {
          from: 'revenue_actuals',
          let: { scopedProjectId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$projectId', '$$scopedProjectId'] },
                    { $eq: ['$fiscalYear', query.fiscalYear] },
                  ],
                },
              },
            },
            { $project: { _id: 0, quarter: 1, revenue: 1, cost: 1 } },
            { $sort: { quarter: 1 } },
          ],
          as: 'quarters',
        },
      },
      {
        $set: {
          hasRevenue: { $gt: [{ $size: '$quarters' }, 0] },
          revenueTotal: { $sum: '$quarters.revenue' },
          costTotal: { $sum: '$quarters.cost' },
        },
      },
      {
        $facet: {
          data: [
            { $match: { hasRevenue: true, ...searchMatch } },
            { $sort: { revenueTotal: -1, name: 1, _id: 1 } },
            { $skip: query.skip },
            { $limit: query.limit },
            {
              $project: {
                code: 1,
                name: 1,
                quarters: 1,
                revenueTotal: 1,
                costTotal: 1,
              },
            },
          ],
          total: [
            { $match: { hasRevenue: true, ...searchMatch } },
            { $count: 'value' },
          ],
          overview: [
            {
              $group: {
                _id: null,
                totalProjects: { $sum: 1 },
                projectsWithRevenue: {
                  $sum: { $cond: ['$hasRevenue', 1, 0] },
                },
                totalRevenue: { $sum: '$revenueTotal' },
                totalCost: { $sum: '$costTotal' },
              },
            },
            { $project: { _id: 0 } },
          ],
          quarters: [
            { $unwind: '$quarters' },
            {
              $group: {
                _id: '$quarters.quarter',
                revenue: { $sum: '$quarters.revenue' },
                cost: { $sum: '$quarters.cost' },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ];
    const [result] = await this.projects.aggregate<RevenueFacet>(pipeline);
    const overviewRow = result?.overview[0];
    const totalRevenue = overviewRow?.totalRevenue ?? 0;
    const totalCost = overviewRow?.totalCost ?? 0;
    const grossProfit = totalRevenue - totalCost;
    const totalProjects = overviewRow?.totalProjects ?? 0;
    const projectsWithRevenue = overviewRow?.projectsWithRevenue ?? 0;
    return {
      projects: (result?.data ?? []).map((row) => this.mapProject(row)),
      totalItems: result?.total[0]?.value ?? 0,
      overview: {
        totalRevenue,
        totalCost,
        grossProfit,
        ...(totalRevenue > 0
          ? { grossMargin: grossProfit / totalRevenue }
          : {}),
        totalProjects,
        projectsWithRevenue,
        projectsWithoutRevenue: totalProjects - projectsWithRevenue,
      },
      quarters: this.completeQuarters(
        (result?.quarters ?? []).map((item) => ({
          quarter: item._id,
          revenue: item.revenue,
          cost: item.cost,
        })),
      ),
    };
  }

  async upsert(input: UpsertRevenueActualRecord): Promise<RevenueActual> {
    const projectId = new Types.ObjectId(input.projectId);
    const actorId = new Types.ObjectId(input.actorId);
    const row = await this.actuals
      .findOneAndUpdate(
        {
          projectId,
          fiscalYear: input.fiscalYear,
          quarter: input.quarter,
        },
        {
          $set: {
            revenue: input.revenue,
            cost: input.cost,
            updatedBy: actorId,
          },
          $setOnInsert: {
            projectId,
            fiscalYear: input.fiscalYear,
            quarter: input.quarter,
            createdBy: actorId,
          },
        },
        {
          upsert: true,
          runValidators: true,
          returnDocument: 'after',
          setDefaultsOnInsert: true,
        },
      )
      .lean<RevenueActualRow>()
      .exec();
    if (!row) throw new Error('Revenue actual could not be saved');
    return {
      id: row._id.toString(),
      projectId: row.projectId.toString(),
      projectCode: input.projectCode,
      projectName: input.projectName,
      fiscalYear: row.fiscalYear,
      quarter: row.quarter,
      revenue: row.revenue,
      cost: row.cost,
      grossProfit: row.revenue - row.cost,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapProject(row: ProjectRevenueRow): RevenueProjectSummary {
    const grossProfit = row.revenueTotal - row.costTotal;
    return {
      projectId: row._id.toString(),
      projectCode: row.code,
      projectName: row.name,
      quarters: this.completeQuarters(row.quarters),
      revenueTotal: row.revenueTotal,
      costTotal: row.costTotal,
      grossProfit,
      ...(row.revenueTotal > 0
        ? { grossMargin: grossProfit / row.revenueTotal }
        : {}),
    };
  }

  private completeQuarters(values: ActualValue[]): RevenueQuarterSummary[] {
    const byQuarter = new Map<FiscalQuarter, ActualValue>();
    for (const item of values) byQuarter.set(item.quarter, item);
    return ([1, 2, 3, 4] as const).map((quarter) => {
      const value = byQuarter.get(quarter);
      const revenue = value?.revenue ?? 0;
      const cost = value?.cost ?? 0;
      return { quarter, revenue, cost, grossProfit: revenue - cost };
    });
  }

  private accessStages(actorId: string, all: boolean): PipelineStage[] {
    if (all) return [];
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

  private searchMatch(search?: string): Record<string, unknown> {
    if (!search) return {};
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const expression = { $regex: escaped, $options: 'i' };
    return { $or: [{ code: expression }, { name: expression }] };
  }
}

@Injectable()
export class MongooseRevenueProjectDirectory
  implements RevenueProjectDirectory
{
  constructor(
    @InjectModel(ProjectEntity.name)
    private readonly projects: Model<ProjectEntity>,
  ) {}

  async findByIdWithAccess(
    projectId: string,
    actorId: string,
    all: boolean,
  ): Promise<RevenueProjectAccess | null> {
    if (!Types.ObjectId.isValid(projectId)) return null;
    const pipeline: PipelineStage[] = [
      { $match: { _id: new Types.ObjectId(projectId) } },
    ];
    if (!all) {
      pipeline.push(
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
      );
    }
    pipeline.push({ $project: { code: 1, name: 1 } }, { $limit: 1 });
    const [row] = await this.projects.aggregate<{
      _id: Types.ObjectId;
      code: string;
      name: string;
    }>(pipeline);
    return row
      ? { id: row._id.toString(), code: row.code, name: row.name }
      : null;
  }
}
