import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  CarrierContract,
  CarrierContractOverview,
  CarrierContractUnit,
  CarrierPaymentCycle,
  CarrierServiceType,
} from '@project-ql/api-contracts';
import { Model, PipelineStage, Types, UpdateQuery } from 'mongoose';
import { ProjectEntity } from '../../projects/infrastructure/project.schemas';
import type {
  CarrierContractProjectAccess,
  CarrierContractProjectDirectory,
  CarrierContractRepository,
  CreateCarrierContractRecord,
  ListCarrierContractsQuery,
  UpdateCarrierContractRecord,
} from '../application/carrier-contract-management.ports';
import { CarrierContractEntity } from './carrier-contract.schemas';

interface Row {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  projectCode: string;
  projectName: string;
  carrier: string;
  serviceType: CarrierServiceType;
  quantity: number;
  unit: CarrierContractUnit;
  unitPrice?: number;
  paymentCycle?: CarrierPaymentCycle;
  startDate?: Date;
  endDate?: Date;
  termsComplete: boolean;
  penetrationRate?: number;
  createdAt: Date;
  updatedAt: Date;
}
interface Facet {
  data: Row[];
  total: Array<{ value: number }>;
  overview: CarrierContractOverview[];
  carriers: Array<{ _id: string }>;
}
const EMPTY: CarrierContractOverview = {
  totalContracts: 0,
  teldataContracts: 0,
  ibsContracts: 0,
  contractsWithTerms: 0,
  coveredProjects: 0,
};

@Injectable()
export class MongooseCarrierContractRepository
  implements CarrierContractRepository
{
  constructor(
    @InjectModel(CarrierContractEntity.name)
    private readonly contracts: Model<CarrierContractEntity>,
  ) {}
  async list(query: ListCarrierContractsQuery) {
    const filter = {
      ...(query.carrier ? { carrier: query.carrier } : {}),
      ...(query.serviceType ? { serviceType: query.serviceType } : {}),
    };
    const pipeline: PipelineStage[] = [
      ...this.joinProject(query.actorId, query.canManageAll),
      {
        $set: {
          termsComplete: {
            $and: [
              { $ne: [{ $ifNull: ['$unitPrice', null] }, null] },
              { $ne: [{ $ifNull: ['$paymentCycle', null] }, null] },
              { $ne: [{ $ifNull: ['$startDate', null] }, null] },
              { $ne: [{ $ifNull: ['$endDate', null] }, null] },
            ],
          },
          penetrationRate: {
            $cond: [
              { $eq: ['$serviceType', 'teldata'] },
              {
                $cond: [
                  { $gt: ['$project.unitCount', 0] },
                  { $divide: ['$quantity', '$project.unitCount'] },
                  null,
                ],
              },
              {
                $cond: [
                  { $gt: ['$project.floorAreaM2', 0] },
                  { $divide: ['$quantity', '$project.floorAreaM2'] },
                  null,
                ],
              },
            ],
          },
          projectCode: '$project.code',
          projectName: '$project.name',
        },
      },
      { $unset: ['project', 'actorMembership'] },
      ...(query.projectId
        ? [
            {
              $match: {
                projectId: new Types.ObjectId(query.projectId),
              },
            } as PipelineStage,
          ]
        : []),
      {
        $facet: {
          data: [
            { $match: filter },
            { $sort: { projectName: 1, carrier: 1, _id: 1 } },
            { $skip: query.skip },
            { $limit: query.limit },
          ],
          total: [{ $match: filter }, { $count: 'value' }],
          overview: [
            {
              $group: {
                _id: null,
                totalContracts: { $sum: 1 },
                teldataContracts: {
                  $sum: { $cond: [{ $eq: ['$serviceType', 'teldata'] }, 1, 0] },
                },
                ibsContracts: {
                  $sum: { $cond: [{ $eq: ['$serviceType', 'ibs'] }, 1, 0] },
                },
                contractsWithTerms: {
                  $sum: { $cond: ['$termsComplete', 1, 0] },
                },
                projects: { $addToSet: '$projectId' },
              },
            },
            {
              $project: {
                _id: 0,
                totalContracts: 1,
                teldataContracts: 1,
                ibsContracts: 1,
                contractsWithTerms: 1,
                coveredProjects: { $size: '$projects' },
              },
            },
          ],
          carriers: [{ $group: { _id: '$carrier' } }, { $sort: { _id: 1 } }],
        },
      },
    ];
    const [result] = await this.contracts.aggregate<Facet>(pipeline);
    return {
      contracts: (result?.data ?? []).map((row) => this.map(row)),
      totalItems: result?.total[0]?.value ?? 0,
      overview: result?.overview[0] ?? EMPTY,
      availableCarriers: (result?.carriers ?? []).map((item) => item._id),
    };
  }
  async create(input: CreateCarrierContractRecord): Promise<CarrierContract> {
    const created = await this.contracts.create({
      ...input,
      projectId: new Types.ObjectId(input.projectId),
      createdBy: new Types.ObjectId(input.createdBy),
      updatedBy: new Types.ObjectId(input.updatedBy),
    });
    const row = await this.findByIdWithAccess(
      created.id,
      input.createdBy,
      true,
    );
    if (!row) throw new Error('Created carrier contract could not be loaded');
    return row;
  }
  async findByIdWithAccess(
    id: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<CarrierContract | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const [row] = await this.contracts.aggregate<Row>([
      { $match: { _id: new Types.ObjectId(id) } },
      ...this.joinProject(actorId, canManageAll),
      {
        $set: {
          projectCode: '$project.code',
          projectName: '$project.name',
          termsComplete: {
            $and: [
              { $ne: [{ $ifNull: ['$unitPrice', null] }, null] },
              { $ne: [{ $ifNull: ['$paymentCycle', null] }, null] },
              { $ne: [{ $ifNull: ['$startDate', null] }, null] },
              { $ne: [{ $ifNull: ['$endDate', null] }, null] },
            ],
          },
          penetrationRate: {
            $cond: [
              { $eq: ['$serviceType', 'teldata'] },
              {
                $cond: [
                  { $gt: ['$project.unitCount', 0] },
                  { $divide: ['$quantity', '$project.unitCount'] },
                  null,
                ],
              },
              {
                $cond: [
                  { $gt: ['$project.floorAreaM2', 0] },
                  { $divide: ['$quantity', '$project.floorAreaM2'] },
                  null,
                ],
              },
            ],
          },
        },
      },
      { $limit: 1 },
    ]);
    return row ? this.map(row) : null;
  }
  async update(
    contract: CarrierContract,
    input: UpdateCarrierContractRecord,
  ): Promise<CarrierContract | null> {
    const set: Record<string, unknown> = {};
    const unset: Record<string, 1> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value === null) unset[key] = 1;
      else
        set[key] =
          key === 'updatedBy' ? new Types.ObjectId(value as string) : value;
    }
    await this.contracts
      .findByIdAndUpdate(
        contract.id,
        { $set: set, $unset: unset } as UpdateQuery<CarrierContractEntity>,
        { runValidators: true },
      )
      .exec();
    return this.findByIdWithAccess(contract.id, input.updatedBy, true);
  }
  private joinProject(actorId: string, all: boolean): PipelineStage[] {
    const result: PipelineStage[] = [
      {
        $lookup: {
          from: 'projects',
          localField: 'projectId',
          foreignField: '_id',
          as: 'project',
        },
      },
      { $unwind: '$project' },
    ];
    if (!all)
      result.push(
        {
          $lookup: {
            from: 'project_memberships',
            let: { pid: '$projectId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$projectId', '$$pid'] },
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
    return result;
  }
  private map(row: Row): CarrierContract {
    return {
      id: row._id.toString(),
      projectId: row.projectId.toString(),
      projectCode: row.projectCode,
      projectName: row.projectName,
      carrier: row.carrier,
      serviceType: row.serviceType,
      quantity: row.quantity,
      unit: row.unit,
      ...(row.unitPrice !== undefined ? { unitPrice: row.unitPrice } : {}),
      ...(row.paymentCycle ? { paymentCycle: row.paymentCycle } : {}),
      ...(row.startDate ? { startDate: row.startDate.toISOString() } : {}),
      ...(row.endDate ? { endDate: row.endDate.toISOString() } : {}),
      termsComplete: row.termsComplete,
      ...(row.penetrationRate !== undefined && row.penetrationRate !== null
        ? { penetrationRate: row.penetrationRate }
        : {}),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

@Injectable()
export class MongooseCarrierContractProjectDirectory
  implements CarrierContractProjectDirectory
{
  constructor(
    @InjectModel(ProjectEntity.name)
    private readonly projects: Model<ProjectEntity>,
  ) {}
  async findByIdWithAccess(
    projectId: string,
    actorId: string,
    all: boolean,
  ): Promise<CarrierContractProjectAccess | null> {
    if (!Types.ObjectId.isValid(projectId)) return null;
    const pipeline: PipelineStage[] = [
      { $match: { _id: new Types.ObjectId(projectId) } },
    ];
    if (!all)
      pipeline.push(
        {
          $lookup: {
            from: 'project_memberships',
            let: { pid: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$projectId', '$$pid'] },
                      { $eq: ['$userId', new Types.ObjectId(actorId)] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: 'membership',
          },
        },
        { $match: { 'membership.0': { $exists: true } } },
      );
    pipeline.push(
      { $project: { code: 1, name: 1, unitCount: 1, floorAreaM2: 1 } },
      { $limit: 1 },
    );
    const [row] = await this.projects.aggregate<{
      _id: Types.ObjectId;
      code: string;
      name: string;
      unitCount?: number;
      floorAreaM2?: number;
    }>(pipeline);
    return row
      ? {
          id: row._id.toString(),
          code: row.code,
          name: row.name,
          ...(row.unitCount !== undefined ? { unitCount: row.unitCount } : {}),
          ...(row.floorAreaM2 !== undefined
            ? { floorAreaM2: row.floorAreaM2 }
            : {}),
        }
      : null;
  }
}
