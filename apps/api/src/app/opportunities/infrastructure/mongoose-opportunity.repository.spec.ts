import { Types } from 'mongoose';
import { MongooseOpportunityRepository } from './mongoose-opportunity.repository';

const id = new Types.ObjectId();
const actorId = new Types.ObjectId().toString();
const row = {
  _id: id,
  name: 'IDS Riverside',
  region: 'south',
  investor: 'IDS Corporation',
  ownerName: 'Chị Lan',
  stage: 3,
  unitCount: 420,
  feasible: true,
  lastInteractionDate: new Date('2026-08-10'),
  createdAt: new Date('2026-08-01'),
  updatedAt: new Date('2026-08-10'),
};

describe('MongooseOpportunityRepository', () => {
  it('maps one faceted list query with filters, overview and owners', async () => {
    const aggregate = jest.fn().mockResolvedValue([
      {
        data: [row],
        total: [{ value: 1 }],
        overview: [
          {
            totalOpportunities: 1,
            feasibleOpportunities: 1,
            missingOwner: 0,
            missingLastInteraction: 0,
            stageCounts: [{ stage: 3, total: 1 }],
          },
        ],
        owners: [{ _id: 'Chị Lan' }],
      },
    ]);
    const repository = new MongooseOpportunityRepository({
      aggregate,
    } as never);

    const result = await repository.list({
      page: 1,
      limit: 20,
      skip: 0,
      search: 'IDS',
      stage: 3,
      region: 'south',
      ownerName: 'Chị Lan',
      feasible: true,
    });

    expect(aggregate).toHaveBeenCalledTimes(1);
    expect(result.opportunities[0]).toMatchObject({
      id: id.toString(),
      stage: 3,
      lastInteractionDate: '2026-08-10T00:00:00.000Z',
    });
    expect(result.overview.stages).toEqual([
      { stage: 1, total: 0 },
      { stage: 2, total: 0 },
      { stage: 3, total: 1 },
      { stage: 4, total: 0 },
    ]);
    expect(result.availableOwners).toEqual(['Chị Lan']);
  });

  it('handles empty results and invalid ids without another query', async () => {
    const aggregate = jest.fn().mockResolvedValue([]);
    const repository = new MongooseOpportunityRepository({
      aggregate,
    } as never);

    await expect(
      repository.list({ page: 1, limit: 20, skip: 0 }),
    ).resolves.toMatchObject({ opportunities: [], totalItems: 0 });
    await expect(repository.findById('invalid')).resolves.toBeNull();
    expect(aggregate).toHaveBeenCalledTimes(1);
  });

  it('creates and updates records then reloads the stable response', async () => {
    const model = {
      create: jest.fn().mockResolvedValue({ id: id.toString() }),
      aggregate: jest.fn().mockResolvedValue([row]),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    };
    const repository = new MongooseOpportunityRepository(model as never);

    await repository.create({
      name: 'IDS Riverside',
      region: 'south',
      stage: 1,
      feasible: false,
      createdBy: actorId,
      updatedBy: actorId,
    });
    await repository.update(
      {
        id: id.toString(),
        name: 'IDS Riverside',
        region: 'south',
        stage: 3,
        feasible: true,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
      { ownerName: null, stage: 4, updatedBy: actorId },
    );

    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
      id.toString(),
      expect.objectContaining({ $unset: { ownerName: 1 } }),
      { runValidators: true },
    );
  });
});
