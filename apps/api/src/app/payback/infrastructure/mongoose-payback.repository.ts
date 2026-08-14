import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  PaybackOverview,
  PaybackProjectSummary,
  PaybackStatus,
} from '@project-ql/api-contracts';
import { Model, PipelineStage, Types } from 'mongoose';
import { ProjectEntity } from '../../projects/infrastructure/project.schemas';
import type {
  PaybackReportQuery,
  PaybackRepository,
} from '../application/payback.ports';

interface PaybackProjectRow {
  _id: Types.ObjectId;
  code: string;
  name: string;
  capex: number;
  cumulativeRevenue: number;
  recoveryRatio: number;
  paybackStatus: PaybackStatus;
}

interface PaybackOverviewRow {
  totalProjects: number;
  evaluableProjects: number;
  paidBackProjects: number;
  notPaidBackProjects: number;
  missingCapexProjects: number;
}

interface PaybackFacetResult {
  data: PaybackProjectRow[];
  total: Array<{ value: number }>;
  overview: PaybackOverviewRow[];
}

const EMPTY_OVERVIEW: PaybackOverview = {
  totalProjects: 0,
  evaluableProjects: 0,
  paidBackProjects: 0,
  notPaidBackProjects: 0,
  missingCapexProjects: 0,
  evaluationCoverage: 0,
};

@Injectable()
export class MongoosePaybackRepository implements PaybackRepository {
  constructor(
    @InjectModel(ProjectEntity.name)
    private readonly projects: Model<ProjectEntity>,
  ) {}

  async getReport(query: PaybackReportQuery): Promise<{
    projects: PaybackProjectSummary[];
    totalItems: number;
    overview: PaybackOverview;
  }> {
    const dataMatch = this.dataMatch(query);
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
                    { $lte: ['$fiscalYear', query.fiscalYear] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                cumulativeRevenue: { $sum: '$revenue' },
              },
            },
          ],
          as: 'revenueSummary',
        },
      },
      {
        $set: {
          cumulativeRevenue: {
            $ifNull: [
              {
                $arrayElemAt: ['$revenueSummary.cumulativeRevenue', 0],
              },
              0,
            ],
          },
          hasEvaluableCapex: { $gt: ['$capex', 0] },
        },
      },
      {
        $set: {
          recoveryRatio: {
            $cond: [
              '$hasEvaluableCapex',
              { $divide: ['$cumulativeRevenue', '$capex'] },
              null,
            ],
          },
          paybackStatus: {
            $cond: [
              '$hasEvaluableCapex',
              {
                $cond: [
                  { $gte: ['$cumulativeRevenue', '$capex'] },
                  'paid_back',
                  'not_paid_back',
                ],
              },
              null,
            ],
          },
        },
      },
      { $unset: 'revenueSummary' },
      {
        $facet: {
          data: [
            { $match: dataMatch },
            { $sort: { recoveryRatio: -1, name: 1, _id: 1 } },
            { $skip: query.skip },
            { $limit: query.limit },
            {
              $project: {
                code: 1,
                name: 1,
                capex: 1,
                cumulativeRevenue: 1,
                recoveryRatio: 1,
                paybackStatus: 1,
              },
            },
          ],
          total: [{ $match: dataMatch }, { $count: 'value' }],
          overview: [
            {
              $group: {
                _id: null,
                totalProjects: { $sum: 1 },
                evaluableProjects: {
                  $sum: { $cond: ['$hasEvaluableCapex', 1, 0] },
                },
                paidBackProjects: {
                  $sum: {
                    $cond: [{ $eq: ['$paybackStatus', 'paid_back'] }, 1, 0],
                  },
                },
                notPaidBackProjects: {
                  $sum: {
                    $cond: [{ $eq: ['$paybackStatus', 'not_paid_back'] }, 1, 0],
                  },
                },
                missingCapexProjects: {
                  $sum: { $cond: ['$hasEvaluableCapex', 0, 1] },
                },
              },
            },
            { $project: { _id: 0 } },
          ],
        },
      },
    ];
    const [result] =
      await this.projects.aggregate<PaybackFacetResult>(pipeline);
    const overview = this.toOverview(result?.overview[0]);
    return {
      projects: (result?.data ?? []).map((row) => this.toProject(row)),
      totalItems: result?.total[0]?.value ?? 0,
      overview,
    };
  }

  private dataMatch(query: PaybackReportQuery): Record<string, unknown> {
    const conditions: Record<string, unknown>[] = [{ hasEvaluableCapex: true }];
    if (query.status) conditions.push({ paybackStatus: query.status });
    if (query.search) {
      const search = this.escapeRegex(query.search);
      conditions.push({
        $or: [
          { code: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
          { investor: { $regex: search, $options: 'i' } },
        ],
      });
    }
    return conditions.length === 1 ? conditions[0] : { $and: conditions };
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

  private toOverview(row?: PaybackOverviewRow): PaybackOverview {
    if (!row) return EMPTY_OVERVIEW;
    return {
      ...row,
      evaluationCoverage:
        row.totalProjects > 0 ? row.evaluableProjects / row.totalProjects : 0,
    };
  }

  private toProject(row: PaybackProjectRow): PaybackProjectSummary {
    return {
      projectId: row._id.toString(),
      projectCode: row.code,
      projectName: row.name,
      capex: row.capex,
      cumulativeRevenue: row.cumulativeRevenue,
      recoveryRatio: row.recoveryRatio,
      status: row.paybackStatus,
    };
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
