import type { DashboardResponse } from '@project-ql/api-contracts';
import type { DashboardRepository } from './dashboard.ports';
import { DashboardService } from './dashboard.service';

const DASHBOARD: DashboardResponse = {
  fiscalYear: 2025,
  overview: {
    totalRevenue: 420,
    totalCost: 200,
    grossProfit: 220,
    grossMargin: 220 / 420,
    projectsWithRevenue: 2,
    totalProjects: 4,
    operationalProjects: 1,
    totalCarrierContracts: 3,
    teldataContracts: 2,
    ibsContracts: 1,
    totalTasks: 10,
    overdueTasks: 2,
    missingCapexProjects: 1,
    dataConflictProjects: 1,
  },
  quarters: [
    { quarter: 1, revenue: 120, cost: 80, grossProfit: 40 },
    { quarter: 2, revenue: 0, cost: 0, grossProfit: 0 },
    { quarter: 3, revenue: 0, cost: 0, grossProfit: 0 },
    { quarter: 4, revenue: 300, cost: 120, grossProfit: 180 },
  ],
  operationalStatuses: [
    { status: 'not_started', projects: 1 },
    { status: 'in_progress', projects: 1 },
    { status: 'partial', projects: 1 },
    { status: 'operational', projects: 1 },
  ],
  topRevenueProjects: [],
  carrierContractsByCarrier: [],
};

describe('DashboardService', () => {
  it('returns one scoped fiscal-year dashboard snapshot', async () => {
    const repository: jest.Mocked<DashboardRepository> = {
      getSnapshot: jest.fn().mockResolvedValue(DASHBOARD),
    };
    const service = new DashboardService(repository);

    const result = await service.getSnapshot(
      'user-1',
      ['projects.read', 'revenue.read', 'opportunities.read'],
      2025,
    );

    expect(repository.getSnapshot).toHaveBeenCalledWith({
      actorId: 'user-1',
      canManageAll: false,
      canReadOpportunities: true,
      fiscalYear: 2025,
      asOf: expect.any(Date),
    });
    expect(result).toEqual(DASHBOARD);
  });

  it('uses the global scope for project managers', async () => {
    const repository: jest.Mocked<DashboardRepository> = {
      getSnapshot: jest.fn().mockResolvedValue(DASHBOARD),
    };
    const service = new DashboardService(repository);

    await service.getSnapshot('manager-1', ['projects.manage'], 2025);

    expect(repository.getSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        canManageAll: true,
        canReadOpportunities: false,
      }),
    );
  });
});
