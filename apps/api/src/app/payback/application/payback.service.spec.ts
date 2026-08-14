import type {
  PaybackOverview,
  PaybackProjectSummary,
} from '@project-ql/api-contracts';
import type { PaybackRepository } from './payback.ports';
import { PaybackService } from './payback.service';

const PROJECT: PaybackProjectSummary = {
  projectId: 'project-1',
  projectCode: 'IDS-01',
  projectName: 'IDS Riverside',
  capex: 300,
  cumulativeRevenue: 420,
  recoveryRatio: 1.4,
  status: 'paid_back',
};

const OVERVIEW: PaybackOverview = {
  totalProjects: 4,
  evaluableProjects: 2,
  paidBackProjects: 1,
  notPaidBackProjects: 1,
  missingCapexProjects: 2,
  evaluationCoverage: 0.5,
};

describe('PaybackService', () => {
  it('returns one scoped cumulative report with pagination metadata', async () => {
    const repository: jest.Mocked<PaybackRepository> = {
      getReport: jest.fn().mockResolvedValue({
        projects: [PROJECT],
        totalItems: 1,
        overview: OVERVIEW,
      }),
    };
    const service = new PaybackService(repository);

    const result = await service.getReport(
      'user-1',
      ['projects.read', 'revenue.read'],
      2,
      20,
      2025,
      'paid_back',
      '  Riverside  ',
    );

    expect(repository.getReport).toHaveBeenCalledWith({
      actorId: 'user-1',
      canManageAll: false,
      page: 2,
      limit: 20,
      skip: 20,
      fiscalYear: 2025,
      status: 'paid_back',
      search: 'Riverside',
    });
    expect(result).toEqual({
      fiscalYear: 2025,
      data: [PROJECT],
      meta: {
        page: 2,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      },
      overview: OVERVIEW,
    });
  });

  it('uses global project scope and omits empty filters', async () => {
    const repository: jest.Mocked<PaybackRepository> = {
      getReport: jest.fn().mockResolvedValue({
        projects: [],
        totalItems: 0,
        overview: OVERVIEW,
      }),
    };
    const service = new PaybackService(repository);

    await service.getReport('manager-1', ['projects.manage'], 1, 20, 2025);

    expect(repository.getReport).toHaveBeenCalledWith({
      actorId: 'manager-1',
      canManageAll: true,
      page: 1,
      limit: 20,
      skip: 0,
      fiscalYear: 2025,
    });
  });
});
