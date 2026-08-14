import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { CarrierContractEntity } from '../../carrier-contracts/infrastructure/carrier-contract.schemas';
import type { ReceivableEntity } from './receivable.schemas';
import { MongooseReceivableRepository } from './mongoose-receivable.repository';

const receivableId = new Types.ObjectId();
const projectId = new Types.ObjectId();
const contractId = new Types.ObjectId();
const actorId = new Types.ObjectId();

describe('MongooseReceivableRepository', () => {
  it('returns scoped receivables and all KPI in one aggregation', async () => {
    const model = {
      aggregate: jest.fn().mockResolvedValue([
        {
          data: [
            {
              _id: receivableId,
              projectId,
              projectCode: 'IDS-01',
              projectName: 'Eco Green',
              carrierContractId: contractId,
              carrier: 'Viettel',
              periodLabel: 'Q3/2026',
              amountDue: 100,
              amountPaid: 40,
              outstandingAmount: 60,
              dueDate: new Date('2026-08-01'),
              paidDate: new Date('2026-07-20'),
              status: 'partial',
              overdue: true,
              createdAt: new Date('2026-07-01'),
              updatedAt: new Date('2026-07-20'),
            },
          ],
          total: [{ value: 1 }],
          overview: [
            {
              totalDue: 100,
              totalPaid: 40,
              totalOutstanding: 60,
              overdueOutstanding: 60,
              overdueItems: 1,
              paidItems: 0,
              onTimePaidItems: 0,
            },
          ],
          carriers: [{ _id: 'Viettel' }],
        },
      ]),
    };
    const repository = new MongooseReceivableRepository(
      model as unknown as Model<ReceivableEntity>,
      { aggregate: jest.fn() } as unknown as Model<CarrierContractEntity>,
    );

    const result = await repository.list({
      actorId: actorId.toString(),
      canManageAll: false,
      page: 1,
      limit: 20,
      skip: 0,
      status: 'overdue',
      search: 'Eco',
      carrier: 'Viettel',
    });

    const pipeline = model.aggregate.mock.calls[0][0];
    expect(pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'projects' }),
        }),
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'project_memberships' }),
        }),
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'carrier_contracts' }),
        }),
        expect.objectContaining({ $facet: expect.any(Object) }),
      ]),
    );
    expect(result.receivables[0]).toMatchObject({
      id: receivableId.toString(),
      outstandingAmount: 60,
      overdue: true,
    });
    expect(result.overview.overdueOutstanding).toBe(60);
    expect(result.availableCarriers).toEqual(['Viettel']);
  });

  it('skips membership lookup for portfolio managers and stabilizes empty KPI', async () => {
    const model = {
      aggregate: jest
        .fn()
        .mockResolvedValue([
          { data: [], total: [], overview: [], carriers: [] },
        ]),
    };
    const repository = new MongooseReceivableRepository(
      model as unknown as Model<ReceivableEntity>,
      { aggregate: jest.fn() } as unknown as Model<CarrierContractEntity>,
    );

    const result = await repository.list({
      actorId: actorId.toString(),
      canManageAll: true,
      page: 1,
      limit: 20,
      skip: 0,
    });

    expect(JSON.stringify(model.aggregate.mock.calls[0][0])).not.toContain(
      'project_memberships',
    );
    expect(result).toMatchObject({
      receivables: [],
      totalItems: 0,
      overview: {
        totalDue: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        overdueOutstanding: 0,
      },
    });
  });

  it('resolves an accessible carrier contract without a second project query', async () => {
    const contracts = {
      aggregate: jest.fn().mockResolvedValue([
        {
          _id: contractId,
          projectId,
          carrier: 'Viettel',
          project: [{ code: 'IDS-01', name: 'Eco Green' }],
        },
      ]),
    };
    const repository = new MongooseReceivableRepository(
      { aggregate: jest.fn() } as unknown as Model<ReceivableEntity>,
      contracts as unknown as Model<CarrierContractEntity>,
    );

    const result = await repository.findContractContext(
      contractId.toString(),
      actorId.toString(),
      false,
    );

    expect(contracts.aggregate).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(contracts.aggregate.mock.calls[0][0])).toContain(
      'project_memberships',
    );
    expect(result).toEqual({
      projectId: projectId.toString(),
      projectCode: 'IDS-01',
      projectName: 'Eco Green',
      carrierContractId: contractId.toString(),
      carrier: 'Viettel',
    });
  });
});
