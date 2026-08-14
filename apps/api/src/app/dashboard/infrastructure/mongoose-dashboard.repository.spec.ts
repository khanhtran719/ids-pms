import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { ProjectEntity } from '../../projects/infrastructure/project.schemas';
import { MongooseDashboardRepository } from './mongoose-dashboard.repository';

const actorId = new Types.ObjectId();
const projectId = new Types.ObjectId();

describe('MongooseDashboardRepository', () => {
  it('computes the scoped dashboard in one bounded aggregation', async () => {
    const projects = {
      aggregate: jest.fn().mockResolvedValue([
        {
          overview: [
            {
              totalProjects: 4,
              operationalProjects: 1,
              totalTasks: 10,
              overdueTasks: 2,
              totalCarrierContracts: 3,
              teldataContracts: 2,
              ibsContracts: 1,
              totalRevenue: 420,
              totalCost: 200,
              projectsWithRevenue: 2,
              missingCapexProjects: 1,
              dataConflictProjects: 1,
            },
          ],
          quarters: [
            { _id: 1, revenue: 120, cost: 80 },
            { _id: 4, revenue: 300, cost: 120 },
          ],
          operationalStatuses: [
            { _id: 'in_progress', projects: 3 },
            { _id: 'operational', projects: 1 },
          ],
          topRevenueProjects: [
            {
              _id: projectId,
              code: 'IDS-01',
              name: 'IDS Riverside',
              revenue: 300,
              cost: 120,
            },
          ],
          carrierContractsByCarrier: [
            { _id: 'Viettel', contracts: 2 },
            { _id: 'VNPT', contracts: 1 },
          ],
        },
      ]),
    };
    const repository = new MongooseDashboardRepository(
      projects as unknown as Model<ProjectEntity>,
    );

    const result = await repository.getSnapshot({
      actorId: actorId.toString(),
      canManageAll: false,
      fiscalYear: 2025,
      asOf: new Date('2026-08-14T00:00:00.000Z'),
    });

    expect(projects.aggregate).toHaveBeenCalledTimes(1);
    const pipeline = projects.aggregate.mock.calls[0][0];
    expect(pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'project_memberships' }),
        }),
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'tasks' }),
        }),
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'carrier_contracts' }),
        }),
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'revenue_actuals' }),
        }),
        expect.objectContaining({ $facet: expect.any(Object) }),
      ]),
    );
    expect(result).toEqual({
      fiscalYear: 2025,
      overview: {
        totalProjects: 4,
        operationalProjects: 1,
        totalTasks: 10,
        overdueTasks: 2,
        totalCarrierContracts: 3,
        teldataContracts: 2,
        ibsContracts: 1,
        totalRevenue: 420,
        totalCost: 200,
        grossProfit: 220,
        grossMargin: 220 / 420,
        projectsWithRevenue: 2,
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
        { status: 'not_started', projects: 0 },
        { status: 'in_progress', projects: 3 },
        { status: 'partial', projects: 0 },
        { status: 'operational', projects: 1 },
      ],
      topRevenueProjects: [
        {
          projectId: projectId.toString(),
          projectCode: 'IDS-01',
          projectName: 'IDS Riverside',
          revenue: 300,
          cost: 120,
          grossProfit: 180,
        },
      ],
      carrierContractsByCarrier: [
        { carrier: 'Viettel', contracts: 2 },
        { carrier: 'VNPT', contracts: 1 },
      ],
    });
  });

  it('skips membership lookup and returns complete zero defaults', async () => {
    const projects = { aggregate: jest.fn().mockResolvedValue([]) };
    const repository = new MongooseDashboardRepository(
      projects as unknown as Model<ProjectEntity>,
    );

    const result = await repository.getSnapshot({
      actorId: actorId.toString(),
      canManageAll: true,
      fiscalYear: 2025,
      asOf: new Date('2026-08-14T00:00:00.000Z'),
    });

    const pipeline = projects.aggregate.mock.calls[0][0] as Array<
      Record<string, unknown>
    >;
    expect(JSON.stringify(pipeline)).not.toContain('project_memberships');
    expect(result.overview.totalProjects).toBe(0);
    expect(result.overview.grossMargin).toBeUndefined();
    expect(result.quarters).toHaveLength(4);
    expect(result.operationalStatuses).toHaveLength(4);
  });
});
