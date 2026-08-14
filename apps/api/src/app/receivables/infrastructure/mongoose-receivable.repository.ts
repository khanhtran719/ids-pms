import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  Receivable,
  ReceivableOverview,
  ReceivableStatus,
} from '@project-ql/api-contracts';
import { Model, PipelineStage, Types, UpdateQuery } from 'mongoose';
import { CarrierContractEntity } from '../../carrier-contracts/infrastructure/carrier-contract.schemas';
import type {
  CreateReceivableRecord,
  ListReceivablesQuery,
  ReceivableContractContext,
  ReceivableRepository,
  UpdateReceivableRecord,
} from '../application/receivable-management.ports';
import { ReceivableEntity } from './receivable.schemas';

interface ReceivableRow {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  projectCode: string;
  projectName: string;
  carrierContractId: Types.ObjectId;
  carrier: string;
  periodLabel: string;
  amountDue: number;
  amountPaid: number;
  outstandingAmount: number;
  dueDate: Date;
  paidDate?: Date;
  status: ReceivableStatus;
  overdue: boolean;
  paidOnTime?: boolean | null;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ReceivableFacet {
  data: ReceivableRow[];
  total: Array<{ value: number }>;
  overview: ReceivableOverview[];
  carriers: Array<{ _id: string }>;
}

interface ContractContextRow {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  carrier: string;
  project: Array<{ code: string; name: string }>;
}

const EMPTY_OVERVIEW: ReceivableOverview = {
  totalDue: 0,
  totalPaid: 0,
  totalOutstanding: 0,
  overdueOutstanding: 0,
  overdueItems: 0,
  paidItems: 0,
  onTimePaidItems: 0,
};

@Injectable()
export class MongooseReceivableRepository implements ReceivableRepository {
  constructor(
    @InjectModel(ReceivableEntity.name)
    private readonly receivables: Model<ReceivableEntity>,
    @InjectModel(CarrierContractEntity.name)
    private readonly contracts: Model<CarrierContractEntity>,
  ) {}

  async list(query: ListReceivablesQuery) {
    const dataFilter = this.dataFilter(query);
    const pipeline: PipelineStage[] = [
      ...(query.projectId
        ? [{ $match: { projectId: new Types.ObjectId(query.projectId) } }]
        : []),
      ...this.enrichmentStages(query.actorId, query.canManageAll, new Date()),
      {
        $facet: {
          data: [
            { $match: dataFilter },
            { $sort: { overdue: -1, dueDate: 1, _id: 1 } },
            { $skip: query.skip },
            { $limit: query.limit },
            { $project: { project: 0, contract: 0, actorMembership: 0 } },
          ],
          total: [{ $match: dataFilter }, { $count: 'value' }],
          overview: [
            {
              $group: {
                _id: null,
                totalDue: { $sum: '$amountDue' },
                totalPaid: { $sum: '$amountPaid' },
                totalOutstanding: { $sum: '$outstandingAmount' },
                overdueOutstanding: {
                  $sum: { $cond: ['$overdue', '$outstandingAmount', 0] },
                },
                overdueItems: { $sum: { $cond: ['$overdue', 1, 0] } },
                paidItems: {
                  $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] },
                },
                onTimePaidItems: {
                  $sum: { $cond: [{ $eq: ['$paidOnTime', true] }, 1, 0] },
                },
              },
            },
            { $project: { _id: 0 } },
          ],
          carriers: [{ $group: { _id: '$carrier' } }, { $sort: { _id: 1 } }],
        },
      },
    ];
    const [result] =
      await this.receivables.aggregate<ReceivableFacet>(pipeline);
    const overview = result?.overview[0] ?? EMPTY_OVERVIEW;
    return {
      receivables: (result?.data ?? []).map((row) => this.map(row)),
      totalItems: result?.total[0]?.value ?? 0,
      overview: {
        ...overview,
        ...(overview.paidItems > 0
          ? { onTimeRate: overview.onTimePaidItems / overview.paidItems }
          : {}),
      },
      availableCarriers: (result?.carriers ?? []).map((item) => item._id),
    };
  }

  async findContractContext(
    contractId: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<ReceivableContractContext | null> {
    if (!Types.ObjectId.isValid(contractId)) return null;
    const pipeline: PipelineStage[] = [
      { $match: { _id: new Types.ObjectId(contractId) } },
      {
        $lookup: {
          from: 'projects',
          localField: 'projectId',
          foreignField: '_id',
          pipeline: [{ $project: { code: 1, name: 1 } }],
          as: 'project',
        },
      },
      { $match: { 'project.0': { $exists: true } } },
      ...this.membershipStages(actorId, canManageAll),
      { $project: { projectId: 1, carrier: 1, project: 1 } },
      { $limit: 1 },
    ];
    const [row] = await this.contracts.aggregate<ContractContextRow>(pipeline);
    const project = row?.project[0];
    return row && project
      ? {
          projectId: row.projectId.toString(),
          projectCode: project.code,
          projectName: project.name,
          carrierContractId: row._id.toString(),
          carrier: row.carrier,
        }
      : null;
  }

  async findByIdWithAccess(
    receivableId: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<Receivable | null> {
    if (!Types.ObjectId.isValid(receivableId)) return null;
    const [row] = await this.receivables.aggregate<ReceivableRow>([
      { $match: { _id: new Types.ObjectId(receivableId) } },
      ...this.enrichmentStages(actorId, canManageAll, new Date()),
      { $limit: 1 },
    ]);
    return row ? this.map(row) : null;
  }

  async create(input: CreateReceivableRecord): Promise<Receivable> {
    const created = await this.receivables.create({
      projectId: new Types.ObjectId(input.projectId),
      carrierContractId: new Types.ObjectId(input.carrierContractId),
      periodLabel: input.periodLabel,
      amountDue: input.amountDue,
      amountPaid: input.amountPaid,
      dueDate: input.dueDate,
      ...(input.paidDate ? { paidDate: input.paidDate } : {}),
      ...(input.note ? { note: input.note } : {}),
      createdBy: new Types.ObjectId(input.createdBy),
      updatedBy: new Types.ObjectId(input.updatedBy),
    });
    return this.mapStored(created as unknown as StoredReceivableRow, input);
  }

  async update(
    current: Receivable,
    input: UpdateReceivableRecord,
  ): Promise<Receivable | null> {
    const set: Record<string, unknown> = {
      periodLabel: input.periodLabel,
      amountDue: input.amountDue,
      amountPaid: input.amountPaid,
      dueDate: input.dueDate,
      updatedBy: new Types.ObjectId(input.updatedBy),
    };
    const unset: Record<string, 1> = {};
    if (input.paidDate) set.paidDate = input.paidDate;
    else unset.paidDate = 1;
    if (input.note) set.note = input.note;
    else unset.note = 1;
    const row = await this.receivables
      .findByIdAndUpdate(
        current.id,
        { $set: set, $unset: unset } as UpdateQuery<ReceivableEntity>,
        { runValidators: true, returnDocument: 'after' },
      )
      .lean<StoredReceivableRow>()
      .exec();
    return row
      ? this.mapStored(row, {
          projectId: current.projectId,
          projectCode: current.projectCode,
          projectName: current.projectName,
          carrierContractId: current.carrierContractId,
          carrier: current.carrier,
        })
      : null;
  }

  private enrichmentStages(
    actorId: string,
    canManageAll: boolean,
    now: Date,
  ): PipelineStage[] {
    return [
      {
        $lookup: {
          from: 'projects',
          localField: 'projectId',
          foreignField: '_id',
          pipeline: [{ $project: { code: 1, name: 1 } }],
          as: 'project',
        },
      },
      { $unwind: '$project' },
      ...this.membershipStages(actorId, canManageAll),
      {
        $lookup: {
          from: 'carrier_contracts',
          localField: 'carrierContractId',
          foreignField: '_id',
          pipeline: [{ $project: { carrier: 1 } }],
          as: 'contract',
        },
      },
      { $unwind: '$contract' },
      {
        $set: {
          projectCode: '$project.code',
          projectName: '$project.name',
          carrier: '$contract.carrier',
          outstandingAmount: {
            $max: [{ $subtract: ['$amountDue', '$amountPaid'] }, 0],
          },
          status: {
            $switch: {
              branches: [
                {
                  case: { $gte: ['$amountPaid', '$amountDue'] },
                  then: 'paid',
                },
                { case: { $gt: ['$amountPaid', 0] }, then: 'partial' },
              ],
              default: 'unpaid',
            },
          },
        },
      },
      {
        $set: {
          overdue: {
            $and: [
              { $gt: ['$outstandingAmount', 0] },
              { $lt: ['$dueDate', now] },
            ],
          },
          paidOnTime: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'paid'] },
                  { $ne: [{ $ifNull: ['$paidDate', null] }, null] },
                ],
              },
              { $lte: ['$paidDate', '$dueDate'] },
              null,
            ],
          },
        },
      },
    ];
  }

  private membershipStages(
    actorId: string,
    canManageAll: boolean,
  ): PipelineStage[] {
    if (canManageAll) return [];
    return [
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
    ];
  }

  private dataFilter(query: ListReceivablesQuery): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    if (query.carrier) filter.carrier = query.carrier;
    if (query.status)
      if (query.status === 'overdue') filter.overdue = true;
      else filter.status = query.status;
    if (query.search) {
      const regex = new RegExp(this.escapeRegex(query.search), 'i');
      filter.$or = [
        { projectCode: regex },
        { projectName: regex },
        { carrier: regex },
        { periodLabel: regex },
      ];
    }
    return filter;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private map(row: ReceivableRow): Receivable {
    return {
      id: row._id.toString(),
      projectId: row.projectId.toString(),
      projectCode: row.projectCode,
      projectName: row.projectName,
      carrierContractId: row.carrierContractId.toString(),
      carrier: row.carrier,
      periodLabel: row.periodLabel,
      amountDue: row.amountDue,
      amountPaid: row.amountPaid,
      outstandingAmount: row.outstandingAmount,
      dueDate: row.dueDate.toISOString(),
      ...(row.paidDate ? { paidDate: row.paidDate.toISOString() } : {}),
      status: row.status,
      overdue: row.overdue,
      ...(typeof row.paidOnTime === 'boolean'
        ? { paidOnTime: row.paidOnTime }
        : {}),
      ...(row.note ? { note: row.note } : {}),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapStored(
    row: StoredReceivableRow,
    context: ReceivableContractContext,
  ): Receivable {
    const outstandingAmount = Math.max(row.amountDue - row.amountPaid, 0);
    const status: ReceivableStatus =
      row.amountPaid >= row.amountDue
        ? 'paid'
        : row.amountPaid > 0
          ? 'partial'
          : 'unpaid';
    const overdue = outstandingAmount > 0 && row.dueDate < new Date();
    return {
      id: row._id.toString(),
      ...context,
      periodLabel: row.periodLabel,
      amountDue: row.amountDue,
      amountPaid: row.amountPaid,
      outstandingAmount,
      dueDate: row.dueDate.toISOString(),
      ...(row.paidDate ? { paidDate: row.paidDate.toISOString() } : {}),
      status,
      overdue,
      ...(status === 'paid' && row.paidDate
        ? { paidOnTime: row.paidDate <= row.dueDate }
        : {}),
      ...(row.note ? { note: row.note } : {}),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

interface StoredReceivableRow {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  carrierContractId: Types.ObjectId;
  periodLabel: string;
  amountDue: number;
  amountPaid: number;
  dueDate: Date;
  paidDate?: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}
