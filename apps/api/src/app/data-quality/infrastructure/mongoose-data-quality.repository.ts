import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  DataQualityIssueType,
  DataQualityProjectIssue,
  DataQualitySummary,
  OpportunityDataQualitySummary,
} from '@project-ql/api-contracts';
import { Model, PipelineStage, Types } from 'mongoose';
import { ProjectEntity } from '../../projects/infrastructure/project.schemas';
import type {
  DataQualityReportQuery,
  DataQualityRepository,
} from '../application/data-quality.ports';

interface DataQualityRow {
  _id: Types.ObjectId;
  code: string;
  name: string;
  investor?: string;
  province?: string;
  issueTypes: DataQualityIssueType[];
  issueCount: number;
  missingTaskPlanCount: number;
  overdueTaskCount: number;
  missingActualEndCount: number;
  updatedAt: Date;
}

interface DataQualityFacetResult {
  data: DataQualityRow[];
  total: Array<{ value: number }>;
  summary: DataQualitySummary[];
  opportunityQuality?: OpportunityDataQualitySummary[];
}

const EMPTY_SUMMARY: DataQualitySummary = {
  totalProjects: 0,
  affectedProjects: 0,
  totalIssues: 0,
  dataConflictProjects: 0,
  missingCapexProjects: 0,
  missingTaskPlanProjects: 0,
  overdueTasks: 0,
  missingActualEndTasks: 0,
};

@Injectable()
export class MongooseDataQualityRepository
  implements DataQualityRepository
{
  constructor(
    @InjectModel(ProjectEntity.name)
    private readonly projects: Model<ProjectEntity>,
  ) {}

  async getReport(query: DataQualityReportQuery): Promise<{
    issues: DataQualityProjectIssue[];
    totalItems: number;
    summary: DataQualitySummary;
    opportunityQuality?: OpportunityDataQualitySummary;
  }> {
    const issueMatch = this.issueMatch(query);
    const pipeline: PipelineStage[] = [
      ...this.accessStages(query.actorId, query.canManageAll),
      {
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
                taskCount: { $sum: 1 },
                existingMissingPlanCount: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          {
                            $eq: [
                              { $ifNull: ['$plannedStartDate', null] },
                              null,
                            ],
                          },
                          {
                            $eq: [
                              { $ifNull: ['$plannedEndDate', null] },
                              null,
                            ],
                          },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                overdueTaskCount: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$status', 'done'] },
                          {
                            $ne: [
                              { $ifNull: ['$plannedEndDate', null] },
                              null,
                            ],
                          },
                          { $lt: ['$plannedEndDate', query.asOf] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                missingActualEndCount: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$status', 'done'] },
                          {
                            $eq: [
                              { $ifNull: ['$actualEndDate', null] },
                              null,
                            ],
                          },
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
          as: 'taskQuality',
        },
      },
      {
        $set: {
          taskCount: {
            $ifNull: [{ $arrayElemAt: ['$taskQuality.taskCount', 0] }, 0],
          },
          existingMissingPlanCount: {
            $ifNull: [
              {
                $arrayElemAt: [
                  '$taskQuality.existingMissingPlanCount',
                  0,
                ],
              },
              0,
            ],
          },
          overdueTaskCount: {
            $ifNull: [
              { $arrayElemAt: ['$taskQuality.overdueTaskCount', 0] },
              0,
            ],
          },
          missingActualEndCount: {
            $ifNull: [
              { $arrayElemAt: ['$taskQuality.missingActualEndCount', 0] },
              0,
            ],
          },
        },
      },
      {
        $set: {
          missingTaskPlanCount: {
            $add: [
              {
                $max: [{ $subtract: [5, '$taskCount'] }, 0],
              },
              '$existingMissingPlanCount',
            ],
          },
          hasDataConflict: { $eq: ['$dataConflict', true] },
          missingCapex: {
            $eq: [{ $ifNull: ['$capex', null] }, null],
          },
        },
      },
      {
        $set: {
          issueTypes: {
            $concatArrays: [
              { $cond: ['$hasDataConflict', ['data_conflict'], []] },
              { $cond: ['$missingCapex', ['missing_capex'], []] },
              {
                $cond: [
                  { $gt: ['$missingTaskPlanCount', 0] },
                  ['missing_task_plan'],
                  [],
                ],
              },
              {
                $cond: [
                  { $gt: ['$overdueTaskCount', 0] },
                  ['overdue_task'],
                  [],
                ],
              },
              {
                $cond: [
                  { $gt: ['$missingActualEndCount', 0] },
                  ['missing_actual_end'],
                  [],
                ],
              },
            ],
          },
          issueCount: {
            $add: [
              { $cond: ['$hasDataConflict', 1, 0] },
              { $cond: ['$missingCapex', 1, 0] },
              '$missingTaskPlanCount',
              '$overdueTaskCount',
              '$missingActualEndCount',
            ],
          },
        },
      },
      { $unset: 'taskQuality' },
      {
        $facet: {
          data: [
            { $match: issueMatch },
            { $sort: { issueCount: -1, updatedAt: -1, _id: 1 } },
            { $skip: query.skip },
            { $limit: query.limit },
            {
              $project: {
                code: 1,
                name: 1,
                investor: 1,
                province: 1,
                issueTypes: 1,
                issueCount: 1,
                missingTaskPlanCount: 1,
                overdueTaskCount: 1,
                missingActualEndCount: 1,
                updatedAt: 1,
              },
            },
          ],
          total: [{ $match: issueMatch }, { $count: 'value' }],
          summary: [
            {
              $group: {
                _id: null,
                totalProjects: { $sum: 1 },
                affectedProjects: {
                  $sum: { $cond: [{ $gt: ['$issueCount', 0] }, 1, 0] },
                },
                totalIssues: { $sum: '$issueCount' },
                dataConflictProjects: {
                  $sum: { $cond: ['$hasDataConflict', 1, 0] },
                },
                missingCapexProjects: {
                  $sum: { $cond: ['$missingCapex', 1, 0] },
                },
                missingTaskPlanProjects: {
                  $sum: {
                    $cond: [{ $gt: ['$missingTaskPlanCount', 0] }, 1, 0],
                  },
                },
                overdueTasks: { $sum: '$overdueTaskCount' },
                missingActualEndTasks: { $sum: '$missingActualEndCount' },
              },
            },
            { $project: { _id: 0 } },
          ],
        },
      },
      ...(query.canReadOpportunities
        ? [this.opportunityQualityLookup()]
        : []),
    ];
    const [result] =
      await this.projects.aggregate<DataQualityFacetResult>(pipeline);
    return {
      issues: (result?.data ?? []).map((row) => this.toIssue(row)),
      totalItems: result?.total[0]?.value ?? 0,
      summary: result?.summary[0] ?? EMPTY_SUMMARY,
      ...(query.canReadOpportunities
        ? {
            opportunityQuality:
              result?.opportunityQuality?.[0] ??
              this.emptyOpportunityQuality(),
          }
        : {}),
    };
  }

  private opportunityQualityLookup(): PipelineStage {
    const missingOwner = {
      $eq: [
        { $trim: { input: { $ifNull: ['$ownerName', ''] } } },
        '',
      ],
    };
    const missingLastInteraction = {
      $eq: [{ $ifNull: ['$lastInteractionDate', null] }, null],
    };
    return {
      $lookup: {
        from: 'opportunities',
        pipeline: [
          {
            $group: {
              _id: null,
              totalOpportunities: { $sum: 1 },
              affectedOpportunities: {
                $sum: {
                  $cond: [
                    { $or: [missingOwner, missingLastInteraction] },
                    1,
                    0,
                  ],
                },
              },
              totalIssues: {
                $sum: {
                  $add: [
                    { $cond: [missingOwner, 1, 0] },
                    { $cond: [missingLastInteraction, 1, 0] },
                  ],
                },
              },
              missingOwner: {
                $sum: { $cond: [missingOwner, 1, 0] },
              },
              missingLastInteraction: {
                $sum: { $cond: [missingLastInteraction, 1, 0] },
              },
            },
          },
          { $project: { _id: 0 } },
        ],
        as: 'opportunityQuality',
      },
    };
  }

  private emptyOpportunityQuality(): OpportunityDataQualitySummary {
    return {
      totalOpportunities: 0,
      affectedOpportunities: 0,
      totalIssues: 0,
      missingOwner: 0,
      missingLastInteraction: 0,
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

  private issueMatch(query: DataQualityReportQuery): Record<string, unknown> {
    const conditions: Record<string, unknown>[] = [{ issueCount: { $gt: 0 } }];
    if (query.issueType) conditions.push({ issueTypes: query.issueType });
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

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private toIssue(row: DataQualityRow): DataQualityProjectIssue {
    return {
      projectId: row._id.toString(),
      projectCode: row.code,
      projectName: row.name,
      ...(row.investor ? { investor: row.investor } : {}),
      ...(row.province ? { province: row.province } : {}),
      issueTypes: row.issueTypes,
      issueCount: row.issueCount,
      missingTaskPlanCount: row.missingTaskPlanCount,
      overdueTaskCount: row.overdueTaskCount,
      missingActualEndCount: row.missingActualEndCount,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
