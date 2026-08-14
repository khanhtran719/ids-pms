import { Types } from 'mongoose';
import { MongooseCarrierContractProjectDirectory, MongooseCarrierContractRepository } from './mongoose-carrier-contract.repositories';

const contractId = new Types.ObjectId();
const projectId = new Types.ObjectId();
const actorId = new Types.ObjectId().toString();
const row = { _id: contractId, projectId, projectCode: 'IDS-01', projectName: 'Riverside', carrier: 'Viettel', serviceType: 'teldata', quantity: 100, unit: 'apartment', termsComplete: false, penetrationRate: 0.5, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02') };

describe('MongooseCarrierContractRepository', () => {
  it('maps a scoped facet result and empty result without N+1 calls', async () => {
    const aggregate = jest.fn().mockResolvedValue([{ data: [row], total: [{ value: 1 }], overview: [{ totalContracts: 1, teldataContracts: 1, ibsContracts: 0, contractsWithTerms: 0, coveredProjects: 1 }], carriers: [{ _id: 'Viettel' }] }]);
    const repo = new MongooseCarrierContractRepository({ aggregate } as never);
    const result = await repo.list({ actorId, canManageAll: false, page: 1, limit: 20, skip: 0, carrier: 'Viettel', serviceType: 'teldata' });
    expect(result.contracts[0]).toMatchObject({ id: contractId.toString(), penetrationRate: 0.5 });
    expect(result.availableCarriers).toEqual(['Viettel']);
    expect(aggregate).toHaveBeenCalledTimes(1);

    aggregate.mockResolvedValueOnce([]);
    await expect(repo.list({ actorId, canManageAll: true, page: 1, limit: 20, skip: 0 })).resolves.toMatchObject({ contracts: [], totalItems: 0, availableCarriers: [] });
  });

  it('returns null for invalid ids and maps optional contract terms', async () => {
    const aggregate = jest.fn().mockResolvedValue([{ ...row, unitPrice: 50, paymentCycle: 'monthly', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), termsComplete: true }]);
    const repo = new MongooseCarrierContractRepository({ aggregate } as never);
    await expect(repo.findByIdWithAccess('invalid', actorId, true)).resolves.toBeNull();
    const found = await repo.findByIdWithAccess(contractId.toString(), actorId, false);
    expect(found).toMatchObject({ unitPrice: 50, paymentCycle: 'monthly', termsComplete: true });
  });

  it('creates and updates records then reloads the stable response', async () => {
    const model = { create: jest.fn().mockResolvedValue({ id: contractId.toString() }), aggregate: jest.fn().mockResolvedValue([row]), findByIdAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }) };
    const repo = new MongooseCarrierContractRepository(model as never);
    await repo.create({ projectId: projectId.toString(), carrier: 'Viettel', serviceType: 'teldata', quantity: 100, unit: 'apartment', createdBy: actorId, updatedBy: actorId });
    expect(model.create).toHaveBeenCalled();
    await repo.update({ id: contractId.toString(), projectId: projectId.toString(), projectCode: 'IDS-01', projectName: 'Riverside', carrier: 'Viettel', serviceType: 'teldata', quantity: 100, unit: 'apartment', termsComplete: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' }, { unitPrice: null, endDate: new Date('2026-12-31'), updatedBy: actorId });
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(contractId.toString(), expect.objectContaining({ $unset: { unitPrice: 1 } }), { runValidators: true });
  });
});

describe('MongooseCarrierContractProjectDirectory', () => {
  it('validates ids and maps globally managed and member-scoped projects', async () => {
    const aggregate = jest.fn().mockResolvedValue([{ _id: projectId, code: 'IDS-01', name: 'Riverside', unitCount: 200 }]);
    const directory = new MongooseCarrierContractProjectDirectory({ aggregate } as never);
    await expect(directory.findByIdWithAccess('bad', actorId, true)).resolves.toBeNull();
    await expect(directory.findByIdWithAccess(projectId.toString(), actorId, false)).resolves.toEqual({ id: projectId.toString(), code: 'IDS-01', name: 'Riverside', unitCount: 200 });
    aggregate.mockResolvedValueOnce([]);
    await expect(directory.findByIdWithAccess(projectId.toString(), actorId, true)).resolves.toBeNull();
  });
});
