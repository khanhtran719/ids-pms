import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  DashboardOperationalStatusSummary,
  DashboardOverview,
  DashboardResponse,
  DashboardTopRevenueProject,
  FiscalQuarter,
  ProjectOperationalStatus,
  RevenueQuarterSummary,
} from '@project-ql/api-contracts';
import { Model, PipelineStage, Types } from 'mongoose';
import { ProjectEntity } from '../../projects/infrastructure/project.schemas';
import type {
  DashboardRepository,
  DashboardSnapshotQuery,
} from '../application/dashboard.ports';

interface DashboardOverviewRow {
  totalProjects: number;
  operationalProjects: number;
  totalTasks: number;
  overdueTasks: number;
  totalCarrierContracts: number;
  teldataContracts: number;
  ibsContracts: number;
  totalRevenue: number;
  totalCost: number;
  projectsWithRevenue: number;
  missingCapexProjects: number;
  dataConflictProjects: number;
}

interface DashboardFacetResult {
  overview: DashboardOverviewRow[];
  quarters: Array<{ _id: FiscalQuarter; revenue: number; cost: number }>;
  operationalStatuses: Array<{
    _id: ProjectOperationalStatus;
    projects: number;
  }>;
  topRevenueProjects: Array<{
    _id: Types.ObjectId;
    code: string;
    name: string;
    revenue: number;
    cost: number;
  }>;
  carrierContractsByCarrier: Array<{ _id: string; contracts: number }>;
}

const EMPTY_OVERVIEW_ROW: DashboardOverviewRow = {
  totalProjects: 0,
  operationalProjects: 0,
  totalTasks: 0,
  overdueTasks: 0,
  totalCarrierContracts: 0,
  teldataContracts: 0,
  ibsContracts: 0,
  totalRevenue: 0,
  totalCost: 0,
  projectsWithRevenue: 0,
  missingCapexProjects: 0,
  dataConflictProjects: 0,
};

const OPERATIONAL_STATUSES: ProjectOperationalStatus[] = [
  'not_started',
  'in_progress',
  'partial',
  'operational',
];

@Injectable()
export class MongooseDashboardRepository implements DashboardRepository {
  constructor(
    @InjectModel(ProjectEntity.name)
    private readonly projects: Model<ProjectEntity>,
  ) {}

  async getSnapshot(query: DashboardSnapshotQuery): Promise<DashboardResponse> {
    const pipeline: PipelineStage[] = [
      ...this.accessStages(query.actorId, query.canManageAll),
      this.taskLookup(query.asOf),
      this.carrierContractLookup(),
      this.revenueLookup(query.fiscalYear),
      {
        $set: {
          totalTasks: {
            $ifNull: [{ $arrayElemAt: ['$taskSummary.totalTasks', 0] }, 0],
          },
          overdueTasks: {
            $ifNull: [{ $arrayElemAt: ['$taskSummary.overdueTasks', 0] }, 0],
          },
          totalCarrierContracts: { $sum: '$carrierSummary.contracts' },
          teldataContracts: {
            $sum: {
              $map: {
                input: '$carrierSummary',
                as: 'group',
                in: {
                  $cond: [
                    { $eq: ['$$group.serviceType', 'teldata'] },
                    '$$group.contracts',
                    0,
                  ],
                },
              },
            },
          },
          ibsContracts: {
            $sum: {
              $map: {
                input: '$carrierSummary',
                as: 'group',
                in: {
                  $cond: [
                    { $eq: ['$$group.serviceType', 'ibs'] },
                    '$$group.contracts',
                    0,
                  ],
                },
              },
            },
          },
          totalRevenue: { $sum: '$revenueQuarters.revenue' },
          totalCost: { $sum: '$revenueQuarters.cost' },
          hasRevenue: { $gt: [{ $size: '$revenueQuarters' }, 0] },
          missingCapex: {
            $eq: [{ $ifNull: ['$capex', null] }, null],
          },
        },
      },
      { $unset: 'taskSummary' },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalProjects: { $sum: 1 },
                operationalProjects: {
                  $sum: {
                    $cond: [
                      { $eq: ['$operationalStatus', 'operational'] },
                      1,
                      0,
                    ],
                  },
                },
                totalTasks: { $sum: '$totalTasks' },
                overdueTasks: { $sum: '$overdueTasks' },
                totalCarrierContracts: { $sum: '$totalCarrierContracts' },
                teldataContracts: { $sum: '$teldataContracts' },
                ibsContracts: { $sum: '$ibsContracts' },
                totalRevenue: { $sum: '$totalRevenue' },
                totalCost: { $sum: '$totalCost' },
                projectsWithRevenue: {
                  $sum: { $cond: ['$hasRevenue', 1, 0] },
                },
                missingCapexProjects: {
                  $sum: { $cond: ['$missingCapex', 1, 0] },
                },
                dataConflictProjects: {
                  $sum: { $cond: [{ $eq: ['$dataConflict', true] }, 1, 0] },
                },
              },
            },
            { $project: { _id: 0 } },
          ],
          quarters: [
            { $unwind: '$revenueQuarters' },
            {
              $group: {
                _id: '$revenueQuarters.quarter',
                revenue: { $sum: '$revenueQuarters.revenue' },
                cost: { $sum: '$revenueQuarters.cost' },
              },
            },
            { $sort: { _id: 1 } },
          ],
          operationalStatuses: [
            { $group: { _id: '$operationalStatus', projects: { $sum: 1 } } },
          ],
          topRevenueProjects: [
            { $match: { hasRevenue: true } },
            { $sort: { totalRevenue: -1, name: 1, _id: 1 } },
            { $limit: 8 },
            {
              $project: {
                code: 1,
                name: 1,
                revenue: '$totalRevenue',
                cost: '$totalCost',
              },
            },
          ],
          carrierContractsByCarrier: [
            { $unwind: '$carrierSummary' },
            {
              $group: {
                _id: '$carrierSummary.carrier',
                contracts: { $sum: '$carrierSummary.contracts' },
              },
            },
            { $sort: { contracts: -1, _id: 1 } },
          ],
        },
      },
    ];
    const [result] =
      await this.projects.aggregate<DashboardFacetResult>(pipeline);
    const overviewRow = result?.overview[0] ?? EMPTY_OVERVIEW_ROW;
    return {
      fiscalYear: query.fiscalYear,
      overview: this.toOverview(overviewRow),
      quarters: this.completeQuarters(result?.quarters ?? []),
      operationalStatuses: this.completeStatuses(
        result?.operationalStatuses ?? [],
      ),
      topRevenueProjects: (result?.topRevenueProjects ?? []).map((row) =>
        this.toTopProject(row),
      ),
      carrierContractsByCarrier: (result?.carrierContractsByCarrier ?? []).map(
        (row) => ({ carrier: row._id, contracts: row.contracts }),
      ),
    };
  }

  private taskLookup(asOf: Date): PipelineStage {
    return {
      $lookup: {
        from: 'tasks',
        let: { scopedProjectId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$projectId', '$$scopedProjectId'] },
            },
          },
          {
            $group: {
              _id: null,
              totalTasks: { $sum: 1 },
              overdueTasks: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$status', 'done'] },
                        {
                          $ne: [{ $ifNull: ['$plannedEndDate', null] }, null],
                        },
                        { $lt: ['$plannedEndDate', asOf] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        as: 'taskSummary',
      },
    };
  }

  private carrierContractLookup(): PipelineStage {
    return {
      $lookup: {
        from: 'carrier_contracts',
        let: { scopedProjectId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$projectId', '$$scopedProjectId'] },
            },
          },
          {
            $group: {
              _id: { carrier: '$carrier', serviceType: '$serviceType' },
              contracts: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              carrier: '$_id.carrier',
              serviceType: '$_id.serviceType',
              contracts: 1,
            },
          },
        ],
        as: 'carrierSummary',
      },
    };
  }

  private revenueLookup(fiscalYear: number): PipelineStage {
    return {
      $lookup: {
        from: 'revenue_actuals',
        let: { scopedProjectId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$projectId', '$$scopedProjectId'] },
                  { $eq: ['$fiscalYear', fiscalYear] },
                ],
              },
            },
          },
          {
            $group: {
              _id: '$quarter',
              revenue: { $sum: '$revenue' },
              cost: { $sum: '$cost' },
            },
          },
          {
            $project: {
              _id: 0,
              quarter: '$_id',
              revenue: 1,
              cost: 1,
            },
          },
        ],
        as: 'revenueQuarters',
      },
    };
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

  private toOverview(row: DashboardOverviewRow): DashboardOverview {
    const grossProfit = row.totalRevenue - row.totalCost;
    return {
      ...row,
      grossProfit,
      ...(row.totalRevenue > 0
        ? { grossMargin: grossProfit / row.totalRevenue }
        : {}),
    };
  }

  private completeQuarters(
    rows: DashboardFacetResult['quarters'],
  ): RevenueQuarterSummary[] {
    const values = new Map(rows.map((row) => [row._id, row]));
    return ([1, 2, 3, 4] as const).map((quarter) => {
      const row = values.get(quarter);
      const revenue = row?.revenue ?? 0;
      const cost = row?.cost ?? 0;
      return { quarter, revenue, cost, grossProfit: revenue - cost };
    });
  }

  private completeStatuses(
    rows: DashboardFacetResult['operationalStatuses'],
  ): DashboardOperationalStatusSummary[] {
    const values = new Map(rows.map((row) => [row._id, row.projects]));
    return OPERATIONAL_STATUSES.map((status) => ({
      status,
      projects: values.get(status) ?? 0,
    }));
  }

  private toTopProject(
    row: DashboardFacetResult['topRevenueProjects'][number],
  ): DashboardTopRevenueProject {
    return {
      projectId: row._id.toString(),
      projectCode: row.code,
      projectName: row.name,
      revenue: row.revenue,
      cost: row.cost,
      grossProfit: row.revenue - row.cost,
    };
  }
}
