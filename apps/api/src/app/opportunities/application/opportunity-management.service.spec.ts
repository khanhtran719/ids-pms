import { BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  BusinessOpportunity,
  OpportunityOverview,
} from '@project-ql/api-contracts';
import type { OpportunityRepository } from './opportunity-management.ports';
import { OpportunityManagementService } from './opportunity-management.service';

const OPPORTUNITY: BusinessOpportunity = {
  id: 'opportunity-1',
  name: 'IDS Riverside',
  region: 'south',
  investor: 'IDS Corporation',
  stage: 2,
  feasible: true,
  createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z',
};

const OVERVIEW: OpportunityOverview = {
  totalOpportunities: 1,
  feasibleOpportunities: 1,
  missingOwner: 1,
  missingLastInteraction: 1,
  stages: [
    { stage: 1, total: 0 },
    { stage: 2, total: 1 },
    { stage: 3, total: 0 },
    { stage: 4, total: 0 },
  ],
};

describe('OpportunityManagementService', () => {
  let repository: jest.Mocked<OpportunityRepository>;
  let service: OpportunityManagementService;

  beforeEach(() => {
    repository = {
      list: jest.fn().mockResolvedValue({
        opportunities: [OPPORTUNITY],
        totalItems: 1,
        overview: OVERVIEW,
        availableOwners: [],
      }),
      create: jest.fn().mockResolvedValue(OPPORTUNITY),
      findById: jest.fn().mockResolvedValue(OPPORTUNITY),
      update: jest.fn().mockResolvedValue(OPPORTUNITY),
    };
    service = new OpportunityManagementService(repository);
  });

  it('normalizes filters and returns stable pagination metadata', async () => {
    const result = await service.list(
      2,
      20,
      '  IDS  ',
      2,
      'south',
      '  Lan  ',
      true,
    );

    expect(repository.list).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      skip: 20,
      search: 'IDS',
      stage: 2,
      region: 'south',
      ownerName: 'Lan',
      feasible: true,
    });
    expect(result.overview).toEqual(OVERVIEW);
    expect(result.meta.totalItems).toBe(1);
  });

  it('creates a normalized opportunity with audit actors', async () => {
    await service.create('user-1', {
      name: '  IDS Riverside  ',
      region: 'south',
      investor: '  IDS Corporation  ',
      ownerName: '  Chị Lan  ',
      stage: 2,
      feasible: true,
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'IDS Riverside',
        investor: 'IDS Corporation',
        ownerName: 'Chị Lan',
        createdBy: 'user-1',
        updatedBy: 'user-1',
      }),
    );
  });

  it('clears optional fields and permits direct stage updates in v1', async () => {
    await service.update('opportunity-1', 'user-1', {
      stage: 4,
      ownerName: null,
      lastInteractionDate: null,
      note: null,
    });

    expect(repository.update).toHaveBeenCalledWith(
      OPPORTUNITY,
      expect.objectContaining({
        stage: 4,
        ownerName: null,
        lastInteractionDate: null,
        note: null,
        updatedBy: 'user-1',
      }),
    );
  });

  it('rejects empty updates and reports missing records', async () => {
    await expect(
      service.update('opportunity-1', 'user-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    repository.findById.mockResolvedValue(null);
    await expect(
      service.update('missing', 'user-1', { stage: 3 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
