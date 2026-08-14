import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { ProjectEntity } from '../../projects/infrastructure/project.schemas';
import type { RevenueActualEntity } from './revenue-actual.schemas';
import {
  MongooseRevenueActualRepository,
  MongooseRevenueProjectDirectory,
} from './mongoose-revenue.repositories';

const projectId = new Types.ObjectId();
const actorId = new Types.ObjectId();

describe('MongooseRevenueActualRepository', () => {
  it('computes scoped portfolio, quarter totals and paginated projects in one aggregation', async () => {
    const projects = {
      aggregate: jest.fn().mockResolvedValue([
        {
          data: [
            {
              _id: projectId,
              code: 'IDS-01',
              name: 'IDS Riverside',
              quarters: [
                { quarter: 1, revenue: 120, cost: 80 },
                { quarter: 4, revenue: 300, cost: 120 },
              ],
              revenueTotal: 420,
              costTotal: 200,
            },
          ],
          total: [{ value: 1 }],
          overview: [
            {
              totalProjects: 4,
              projectsWithRevenue: 1,
              totalRevenue: 420,
              totalCost: 200,
            },
          ],
          quarters: [
            { _id: 1, revenue: 120, cost: 80 },
            { _id: 4, revenue: 300, cost: 120 },
          ],
        },
      ]),
    };
    const repository = new MongooseRevenueActualRepository(
      {} as Model<RevenueActualEntity>,
      projects as unknown as Model<ProjectEntity>,
    );

    const report = await repository.getReport({
      actorId: actorId.toString(),
      canManageAll: false,
      page: 1,
      limit: 20,
      skip: 0,
      fiscalYear: 2025,
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
    expect(report).toEqual({
      projects: [
        {
          projectId: projectId.toString(),
          projectCode: 'IDS-01',
          projectName: 'IDS Riverside',
          quarters: [
            { quarter: 1, revenue: 120, cost: 80, grossProfit: 40 },
            { quarter: 2, revenue: 0, cost: 0, grossProfit: 0 },
            { quarter: 3, revenue: 0, cost: 0, grossProfit: 0 },
            { quarter: 4, revenue: 300, cost: 120, grossProfit: 180 },
          ],
          revenueTotal: 420,
          costTotal: 200,
          grossProfit: 220,
          grossMargin: 220 / 420,
        },
      ],
      totalItems: 1,
      overview: {
        totalProjects: 4,
        projectsWithRevenue: 1,
        projectsWithoutRevenue: 3,
        totalRevenue: 420,
        totalCost: 200,
        grossProfit: 220,
        grossMargin: 220 / 420,
      },
      quarters: [
        { quarter: 1, revenue: 120, cost: 80, grossProfit: 40 },
        { quarter: 2, revenue: 0, cost: 0, grossProfit: 0 },
        { quarter: 3, revenue: 0, cost: 0, grossProfit: 0 },
        { quarter: 4, revenue: 300, cost: 120, grossProfit: 180 },
      ],
    });
  });

  it('returns zero defaults and skips membership lookup for global managers', async () => {
    const projects = { aggregate: jest.fn().mockResolvedValue([]) };
    const repository = new MongooseRevenueActualRepository(
      {} as Model<RevenueActualEntity>,
      projects as unknown as Model<ProjectEntity>,
    );

    const report = await repository.getReport({
      actorId: actorId.toString(),
      canManageAll: true,
      page: 1,
      limit: 20,
      skip: 0,
      fiscalYear: 2025,
    });

    const pipeline = projects.aggregate.mock.calls[0][0] as Array<
      Record<string, unknown>
    >;
    const lookups = pipeline
      .filter((stage) => '$lookup' in stage)
      .map((stage) => stage.$lookup);
    expect(lookups).toEqual([
      expect.objectContaining({ from: 'revenue_actuals' }),
    ]);
    expect(report.overview).toEqual({
      totalProjects: 0,
      projectsWithRevenue: 0,
      projectsWithoutRevenue: 0,
      totalRevenue: 0,
      totalCost: 0,
      grossProfit: 0,
    });
    expect(report.quarters).toHaveLength(4);
  });

  it('scopes the report to an exact project and keeps projects without actuals in the data facet', async () => {
    const projects = { aggregate: jest.fn().mockResolvedValue([]) };
    const repository = new MongooseRevenueActualRepository(
      {} as Model<RevenueActualEntity>,
      projects as unknown as Model<ProjectEntity>,
    );

    await repository.getReport({
      actorId: actorId.toString(),
      canManageAll: false,
      page: 1,
      limit: 1,
      skip: 0,
      fiscalYear: 2025,
      projectId: projectId.toString(),
    });

    const pipeline = projects.aggregate.mock.calls[0][0] as Array<
      Record<string, unknown>
    >;
    expect(pipeline[0]).toEqual({ $match: { _id: projectId } });
    const facetStage = pipeline.find((stage) => '$facet' in stage) as {
      $facet: { data: Array<Record<string, unknown>> };
    };
    expect(facetStage.$facet.data[0]).toEqual({ $match: {} });
  });

  it('upserts one unique project-year-quarter record and derives profit', async () => {
    const row = {
      _id: new Types.ObjectId(),
      projectId,
      fiscalYear: 2025,
      quarter: 2,
      revenue: 150,
      cost: 90,
      createdAt: new Date('2026-08-14T00:00:00.000Z'),
      updatedAt: new Date('2026-08-14T01:00:00.000Z'),
    };
    const exec = jest.fn().mockResolvedValue(row);
    const actuals = {
      findOneAndUpdate: jest.fn().mockReturnValue({ lean: () => ({ exec }) }),
    };
    const repository = new MongooseRevenueActualRepository(
      actuals as unknown as Model<RevenueActualEntity>,
      {} as Model<ProjectEntity>,
    );

    const result = await repository.upsert({
      projectId: projectId.toString(),
      projectCode: 'IDS-01',
      projectName: 'IDS Riverside',
      fiscalYear: 2025,
      quarter: 2,
      revenue: 150,
      cost: 90,
      actorId: actorId.toString(),
    });

    expect(actuals.findOneAndUpdate).toHaveBeenCalledWith(
      { projectId, fiscalYear: 2025, quarter: 2 },
      expect.objectContaining({
        $set: expect.objectContaining({ revenue: 150, cost: 90 }),
        $setOnInsert: expect.objectContaining({ createdBy: actorId }),
      }),
      expect.objectContaining({
        upsert: true,
        runValidators: true,
        returnDocument: 'after',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        projectCode: 'IDS-01',
        quarter: 2,
        grossProfit: 60,
      }),
    );
  });
});

describe('MongooseRevenueProjectDirectory', () => {
  it('requires membership when resolving a project for a scoped writer', async () => {
    const projects = {
      aggregate: jest
        .fn()
        .mockResolvedValue([
          { _id: projectId, code: 'IDS-01', name: 'IDS Riverside' },
        ]),
    };
    const directory = new MongooseRevenueProjectDirectory(
      projects as unknown as Model<ProjectEntity>,
    );

    const result = await directory.findByIdWithAccess(
      projectId.toString(),
      actorId.toString(),
      false,
    );

    expect(projects.aggregate.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'project_memberships' }),
        }),
      ]),
    );
    expect(result).toEqual({
      id: projectId.toString(),
      code: 'IDS-01',
      name: 'IDS Riverside',
    });
  });
});
