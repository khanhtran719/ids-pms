import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  BusinessOpportunity,
  OpportunityOverview,
  OpportunityRegion,
  OpportunityStage,
} from '@project-ql/api-contracts';
import { Model, Types, UpdateQuery } from 'mongoose';
import type {
  CreateOpportunityRecord,
  ListOpportunitiesQuery,
  OpportunityRepository,
  UpdateOpportunityRecord,
} from '../application/opportunity-management.ports';
import { OpportunityEntity } from './opportunity.schemas';

interface OpportunityRow {
  _id: Types.ObjectId;
  name: string;
  region: OpportunityRegion;
  province?: string;
  investor?: string;
  projectType?: string;
  ownerName?: string;
  stage: OpportunityStage;
  unitCount?: number;
  floorAreaM2?: number;
  note?: string;
  feasible: boolean;
  lastInteractionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface OverviewRow extends Omit<OpportunityOverview, 'stages'> {
  stageCounts: Array<{ stage: OpportunityStage; total: number }>;
}

interface OpportunityFacet {
  data: OpportunityRow[];
  total: Array<{ value: number }>;
  overview: OverviewRow[];
  owners: Array<{ _id: string }>;
}

const EMPTY_OVERVIEW: OpportunityOverview = {
  totalOpportunities: 0,
  feasibleOpportunities: 0,
  missingOwner: 0,
  missingLastInteraction: 0,
  stages: [1, 2, 3, 4].map((stage) => ({
    stage: stage as OpportunityStage,
    total: 0,
  })),
};

@Injectable()
export class MongooseOpportunityRepository implements OpportunityRepository {
  constructor(
    @InjectModel(OpportunityEntity.name)
    private readonly opportunities: Model<OpportunityEntity>,
  ) {}

  async list(query: ListOpportunitiesQuery) {
    const filter = this.listFilter(query);
    const match = Object.keys(filter).length ? [{ $match: filter }] : [];
    const [result] = await this.opportunities.aggregate<OpportunityFacet>([
      {
        $facet: {
          data: [
            ...match,
            { $sort: { stage: -1, lastInteractionDate: -1, _id: 1 } },
            { $skip: query.skip },
            { $limit: query.limit },
          ],
          total: [...match, { $count: 'value' }],
          overview: [
            {
              $group: {
                _id: null,
                totalOpportunities: { $sum: 1 },
                feasibleOpportunities: {
                  $sum: { $cond: ['$feasible', 1, 0] },
                },
                missingOwner: {
                  $sum: {
                    $cond: [
                      { $eq: [{ $ifNull: ['$ownerName', ''] }, ''] },
                      1,
                      0,
                    ],
                  },
                },
                missingLastInteraction: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          { $ifNull: ['$lastInteractionDate', null] },
                          null,
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                stage1: { $sum: { $cond: [{ $eq: ['$stage', 1] }, 1, 0] } },
                stage2: { $sum: { $cond: [{ $eq: ['$stage', 2] }, 1, 0] } },
                stage3: { $sum: { $cond: [{ $eq: ['$stage', 3] }, 1, 0] } },
                stage4: { $sum: { $cond: [{ $eq: ['$stage', 4] }, 1, 0] } },
              },
            },
            {
              $project: {
                _id: 0,
                totalOpportunities: 1,
                feasibleOpportunities: 1,
                missingOwner: 1,
                missingLastInteraction: 1,
                stageCounts: [
                  { stage: 1, total: '$stage1' },
                  { stage: 2, total: '$stage2' },
                  { stage: 3, total: '$stage3' },
                  { stage: 4, total: '$stage4' },
                ],
              },
            },
          ],
          owners: [
            { $match: { ownerName: { $exists: true, $ne: '' } } },
            { $group: { _id: '$ownerName' } },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);
    const overview = result?.overview[0];
    return {
      opportunities: (result?.data ?? []).map((row) => this.map(row)),
      totalItems: result?.total[0]?.value ?? 0,
      overview: overview
        ? {
            totalOpportunities: overview.totalOpportunities,
            feasibleOpportunities: overview.feasibleOpportunities,
            missingOwner: overview.missingOwner,
            missingLastInteraction: overview.missingLastInteraction,
            stages: this.normalizeStages(overview.stageCounts),
          }
        : EMPTY_OVERVIEW,
      availableOwners: (result?.owners ?? []).map((owner) => owner._id),
    };
  }

  async create(input: CreateOpportunityRecord): Promise<BusinessOpportunity> {
    const created = await this.opportunities.create({
      ...input,
      createdBy: new Types.ObjectId(input.createdBy),
      updatedBy: new Types.ObjectId(input.updatedBy),
    });
    const opportunity = await this.findById(created.id);
    if (!opportunity)
      throw new Error('Created opportunity could not be loaded');
    return opportunity;
  }

  async findById(id: string): Promise<BusinessOpportunity | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const [row] = await this.opportunities.aggregate<OpportunityRow>([
      { $match: { _id: new Types.ObjectId(id) } },
      { $limit: 1 },
    ]);
    return row ? this.map(row) : null;
  }

  async update(
    opportunity: BusinessOpportunity,
    input: UpdateOpportunityRecord,
  ): Promise<BusinessOpportunity | null> {
    const set: Record<string, unknown> = {};
    const unset: Record<string, 1> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value === null) unset[key] = 1;
      else
        set[key] =
          key === 'updatedBy' ? new Types.ObjectId(value as string) : value;
    }
    await this.opportunities
      .findByIdAndUpdate(
        opportunity.id,
        { $set: set, $unset: unset } as UpdateQuery<OpportunityEntity>,
        { runValidators: true },
      )
      .exec();
    return this.findById(opportunity.id);
  }

  private listFilter(query: ListOpportunitiesQuery): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      ...(query.stage ? { stage: query.stage } : {}),
      ...(query.region ? { region: query.region } : {}),
      ...(query.ownerName ? { ownerName: query.ownerName } : {}),
      ...(query.feasible !== undefined ? { feasible: query.feasible } : {}),
    };
    if (query.search) {
      const expression = new RegExp(this.escapeRegex(query.search), 'i');
      filter.$or = [
        { name: expression },
        { investor: expression },
        { province: expression },
        { projectType: expression },
        { ownerName: expression },
      ];
    }
    return filter;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private normalizeStages(
    values: Array<{ stage: OpportunityStage; total: number }>,
  ) {
    const totals = new Map(values.map((value) => [value.stage, value.total]));
    return [1, 2, 3, 4].map((stage) => ({
      stage: stage as OpportunityStage,
      total: totals.get(stage as OpportunityStage) ?? 0,
    }));
  }

  private map(row: OpportunityRow): BusinessOpportunity {
    return {
      id: row._id.toString(),
      name: row.name,
      region: row.region,
      ...(row.province ? { province: row.province } : {}),
      ...(row.investor ? { investor: row.investor } : {}),
      ...(row.projectType ? { projectType: row.projectType } : {}),
      ...(row.ownerName ? { ownerName: row.ownerName } : {}),
      stage: row.stage,
      ...(row.unitCount !== undefined ? { unitCount: row.unitCount } : {}),
      ...(row.floorAreaM2 !== undefined
        ? { floorAreaM2: row.floorAreaM2 }
        : {}),
      ...(row.note ? { note: row.note } : {}),
      feasible: row.feasible,
      ...(row.lastInteractionDate
        ? { lastInteractionDate: row.lastInteractionDate.toISOString() }
        : {}),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
