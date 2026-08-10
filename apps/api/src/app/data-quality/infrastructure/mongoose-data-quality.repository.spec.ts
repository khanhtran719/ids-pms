import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { ProjectEntity } from '../../projects/infrastructure/project.schemas';
import { MongooseDataQualityRepository } from './mongoose-data-quality.repository';

const projectId = new Types.ObjectId();
const actorId = new Types.ObjectId();

describe('MongooseDataQualityRepository', () => {
  it('computes scoped summary and paginated issues in one aggregation', async () => {
    const projects = {
      aggregate: jest.fn().mockResolvedValue([
        {
          data: [
            {
              _id: projectId,
              code: 'IDS-01',
              name: 'IDS Riverside',
              investor: 'IDS Corporation',
              province: 'Hồ Chí Minh',
              issueTypes: ['data_conflict', 'missing_task_plan'],
              issueCount: 3,
              missingTaskPlanCount: 2,
              overdueTaskCount: 0,
              missingActualEndCount: 0,
              updatedAt: new Date('2026-08-10T00:00:00.000Z'),
            },
          ],
          total: [{ value: 1 }],
          summary: [
            {
              totalProjects: 4,
              affectedProjects: 2,
              totalIssues: 5,
              dataConflictProjects: 1,
              missingCapexProjects: 1,
              missingTaskPlanProjects: 2,
              overdueTasks: 1,
              missingActualEndTasks: 0,
            },
          ],
        },
      ]),
    };
    const repository = new MongooseDataQualityRepository(
      projects as unknown as Model<ProjectEntity>,
    );

    const report = await repository.getReport({
      actorId: actorId.toString(),
      canManageAll: false,
      page: 1,
      limit: 20,
      skip: 0,
      issueType: 'missing_task_plan',
      search: 'Riverside',
      asOf: new Date('2026-08-11T00:00:00.000Z'),
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
        expect.objectContaining({ $facet: expect.any(Object) }),
      ]),
    );
    expect(report).toEqual({
      issues: [
        expect.objectContaining({
          projectId: projectId.toString(),
          projectCode: 'IDS-01',
          issueCount: 3,
          updatedAt: '2026-08-10T00:00:00.000Z',
        }),
      ],
      totalItems: 1,
      summary: expect.objectContaining({
        totalProjects: 4,
        affectedProjects: 2,
        totalIssues: 5,
      }),
    });
  });

  it('skips membership lookup for global managers and returns empty defaults', async () => {
    const projects = { aggregate: jest.fn().mockResolvedValue([]) };
    const repository = new MongooseDataQualityRepository(
      projects as unknown as Model<ProjectEntity>,
    );

    const report = await repository.getReport({
      actorId: actorId.toString(),
      canManageAll: true,
      page: 1,
      limit: 20,
      skip: 0,
      asOf: new Date('2026-08-11T00:00:00.000Z'),
    });

    const pipeline = projects.aggregate.mock.calls[0][0] as Array<
      Record<string, unknown>
    >;
    const lookups = pipeline
      .filter((stage) => '$lookup' in stage)
      .map((stage) => stage.$lookup);
    expect(lookups).toEqual([
      expect.objectContaining({ from: 'tasks' }),
    ]);
    expect(report).toEqual({
      issues: [],
      totalItems: 0,
      summary: {
        totalProjects: 0,
        affectedProjects: 0,
        totalIssues: 0,
        dataConflictProjects: 0,
        missingCapexProjects: 0,
        missingTaskPlanProjects: 0,
        overdueTasks: 0,
        missingActualEndTasks: 0,
      },
    });
  });
});
