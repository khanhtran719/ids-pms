import { NotFoundException } from '@nestjs/common';
import type {
  RevenueActual,
  RevenueOverview,
  RevenueQuarterSummary,
  RevenueProjectSummary,
} from '@project-ql/api-contracts';
import type {
  RevenueActualRepository,
  RevenueProjectDirectory,
} from './revenue-management.ports';
import { RevenueManagementService } from './revenue-management.service';

const PROJECT: RevenueProjectSummary = {
  projectId: 'project-1',
  projectCode: 'IDS-01',
  projectName: 'IDS Riverside',
  quarters: [
    {
      quarter: 1,
      revenue: 120_000_000,
      cost: 80_000_000,
      grossProfit: 40_000_000,
    },
  ],
  revenueTotal: 120_000_000,
  costTotal: 80_000_000,
  grossProfit: 40_000_000,
  grossMargin: 1 / 3,
};

const OVERVIEW: RevenueOverview = {
  totalRevenue: 120_000_000,
  totalCost: 80_000_000,
  grossProfit: 40_000_000,
  grossMargin: 1 / 3,
  totalProjects: 4,
  projectsWithRevenue: 1,
  projectsWithoutRevenue: 3,
};

const QUARTERS: RevenueQuarterSummary[] = [
  {
    quarter: 1,
    revenue: 120_000_000,
    cost: 80_000_000,
    grossProfit: 40_000_000,
  },
  { quarter: 2, revenue: 0, cost: 0, grossProfit: 0 },
  { quarter: 3, revenue: 0, cost: 0, grossProfit: 0 },
  { quarter: 4, revenue: 0, cost: 0, grossProfit: 0 },
];

const ACTUAL: RevenueActual = {
  id: 'actual-1',
  projectId: 'project-1',
  projectCode: 'IDS-01',
  projectName: 'IDS Riverside',
  fiscalYear: 2025,
  quarter: 1,
  revenue: 120_000_000,
  cost: 80_000_000,
  grossProfit: 40_000_000,
  createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z',
};

describe('RevenueManagementService', () => {
  let actuals: jest.Mocked<RevenueActualRepository>;
  let projects: jest.Mocked<RevenueProjectDirectory>;
  let service: RevenueManagementService;

  beforeEach(() => {
    actuals = {
      getReport: jest.fn().mockResolvedValue({
        projects: [PROJECT],
        totalItems: 1,
        overview: OVERVIEW,
        quarters: QUARTERS,
      }),
      upsert: jest.fn().mockResolvedValue(ACTUAL),
    };
    projects = {
      findByIdWithAccess: jest.fn().mockResolvedValue({
        id: 'project-1',
        code: 'IDS-01',
        name: 'IDS Riverside',
      }),
    };
    service = new RevenueManagementService(actuals, projects);
  });

  it('returns a scoped fiscal-year report with pagination metadata', async () => {
    const result = await service.list(
      'user-1',
      ['revenue.read', 'projects.read'],
      2,
      20,
      2025,
      '  Riverside  ',
    );

    expect(actuals.getReport).toHaveBeenCalledWith({
      actorId: 'user-1',
      canManageAll: false,
      page: 2,
      limit: 20,
      skip: 20,
      fiscalYear: 2025,
      search: 'Riverside',
    });
    expect(result.overview).toEqual(OVERVIEW);
    expect(result.quarters).toEqual(QUARTERS);
    expect(result.meta.totalItems).toBe(1);
  });

  it('upserts one quarterly actual for an accessible project', async () => {
    await service.upsert('user-1', ['revenue.manage', 'projects.read'], {
      projectId: 'project-1',
      fiscalYear: 2025,
      quarter: 1,
      revenue: 120_000_000,
      cost: 80_000_000,
    });

    expect(actuals.upsert).toHaveBeenCalledWith({
      projectId: 'project-1',
      projectCode: 'IDS-01',
      projectName: 'IDS Riverside',
      fiscalYear: 2025,
      quarter: 1,
      revenue: 120_000_000,
      cost: 80_000_000,
      actorId: 'user-1',
    });
  });

  it('rejects writes outside the actor project scope', async () => {
    projects.findByIdWithAccess.mockResolvedValue(null);

    await expect(
      service.upsert('user-1', ['revenue.manage', 'projects.read'], {
        projectId: 'outside-project',
        fiscalYear: 2025,
        quarter: 4,
        revenue: 10,
        cost: 5,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(actuals.upsert).not.toHaveBeenCalled();
  });
});
