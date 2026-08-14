import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { ProjectEntity } from '../../projects/infrastructure/project.schemas';
import { MongoosePaybackRepository } from './mongoose-payback.repository';

const actorId = new Types.ObjectId();
const projectId = new Types.ObjectId();

describe('MongoosePaybackRepository', () => {
  it('calculates cumulative revenue and payback in one scoped aggregation', async () => {
    const projects = {
      aggregate: jest.fn().mockResolvedValue([
        {
          data: [
            {
              _id: projectId,
              code: 'IDS-01',
              name: 'IDS Riverside',
              capex: 300,
              cumulativeRevenue: 420,
              recoveryRatio: 1.4,
              paybackStatus: 'paid_back',
            },
          ],
          total: [{ value: 1 }],
          overview: [
            {
              totalProjects: 4,
              evaluableProjects: 2,
              paidBackProjects: 1,
              notPaidBackProjects: 1,
              missingCapexProjects: 2,
            },
          ],
        },
      ]),
    };
    const repository = new MongoosePaybackRepository(
      projects as unknown as Model<ProjectEntity>,
    );

    const result = await repository.getReport({
      actorId: actorId.toString(),
      canManageAll: false,
      page: 1,
      limit: 20,
      skip: 0,
      fiscalYear: 2025,
      status: 'paid_back',
      search: 'Riverside',
    });

    expect(projects.aggregate).toHaveBeenCalledTimes(1);
    const pipeline = projects.aggregate.mock.calls[0][0];
    expect(pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'project_memberships' }),
        }),
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'revenue_actuals' }),
        }),
        expect.objectContaining({ $facet: expect.any(Object) }),
      ]),
    );
    expect(JSON.stringify(pipeline)).toContain('$lte');
    expect(result).toEqual({
      projects: [
        {
          projectId: projectId.toString(),
          projectCode: 'IDS-01',
          projectName: 'IDS Riverside',
          capex: 300,
          cumulativeRevenue: 420,
          recoveryRatio: 1.4,
          status: 'paid_back',
        },
      ],
      totalItems: 1,
      overview: {
        totalProjects: 4,
        evaluableProjects: 2,
        paidBackProjects: 1,
        notPaidBackProjects: 1,
        missingCapexProjects: 2,
        evaluationCoverage: 0.5,
      },
    });
  });

  it('skips membership lookup and returns zero defaults', async () => {
    const projects = { aggregate: jest.fn().mockResolvedValue([]) };
    const repository = new MongoosePaybackRepository(
      projects as unknown as Model<ProjectEntity>,
    );

    const result = await repository.getReport({
      actorId: actorId.toString(),
      canManageAll: true,
      page: 1,
      limit: 20,
      skip: 0,
      fiscalYear: 2025,
    });

    expect(JSON.stringify(projects.aggregate.mock.calls[0][0])).not.toContain(
      'project_memberships',
    );
    expect(result).toEqual({
      projects: [],
      totalItems: 0,
      overview: {
        totalProjects: 0,
        evaluableProjects: 0,
        paidBackProjects: 0,
        notPaidBackProjects: 0,
        missingCapexProjects: 0,
        evaluationCoverage: 0,
      },
    });
  });
});
