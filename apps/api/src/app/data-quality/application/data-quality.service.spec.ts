import type {
  DataQualityProjectIssue,
  DataQualitySummary,
} from '@project-ql/api-contracts';
import type { DataQualityRepository } from './data-quality.ports';
import { DataQualityService } from './data-quality.service';

const ISSUE: DataQualityProjectIssue = {
  projectId: 'project-1',
  projectCode: 'IDS-01',
  projectName: 'IDS Riverside',
  investor: 'IDS Corporation',
  province: 'Hồ Chí Minh',
  issueTypes: ['data_conflict', 'missing_task_plan'],
  issueCount: 3,
  missingTaskPlanCount: 2,
  overdueTaskCount: 0,
  missingActualEndCount: 0,
  updatedAt: '2026-08-10T00:00:00.000Z',
};

const SUMMARY: DataQualitySummary = {
  totalProjects: 4,
  affectedProjects: 2,
  totalIssues: 5,
  dataConflictProjects: 1,
  missingCapexProjects: 1,
  missingTaskPlanProjects: 2,
  overdueTasks: 1,
  missingActualEndTasks: 0,
};

const OPPORTUNITY_QUALITY = {
  totalOpportunities: 7,
  affectedOpportunities: 4,
  totalIssues: 5,
  missingOwner: 2,
  missingLastInteraction: 3,
};

describe('DataQualityService', () => {
  it('returns an accessible paginated report with normalized filters', async () => {
    const repository: jest.Mocked<DataQualityRepository> = {
      getReport: jest.fn().mockResolvedValue({
        issues: [ISSUE],
        totalItems: 1,
        summary: SUMMARY,
        opportunityQuality: OPPORTUNITY_QUALITY,
      }),
    };
    const service = new DataQualityService(repository);

    const report = await service.getReport(
      'user-1',
      ['projects.read', 'tasks.read', 'opportunities.read'],
      2,
      20,
      'missing_task_plan',
      '  Riverside  ',
    );

    expect(repository.getReport).toHaveBeenCalledWith({
      actorId: 'user-1',
      canManageAll: false,
      canReadOpportunities: true,
      page: 2,
      limit: 20,
      skip: 20,
      issueType: 'missing_task_plan',
      search: 'Riverside',
      asOf: expect.any(Date),
    });
    expect(report).toEqual({
      data: [ISSUE],
      meta: {
        page: 2,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      },
      summary: SUMMARY,
      opportunityQuality: OPPORTUNITY_QUALITY,
    });
  });

  it('uses global project scope and omits blank optional filters', async () => {
    const repository: jest.Mocked<DataQualityRepository> = {
      getReport: jest.fn().mockResolvedValue({
        issues: [],
        totalItems: 0,
        summary: SUMMARY,
      }),
    };
    const service = new DataQualityService(repository);

    await service.getReport(
      'admin-1',
      ['projects.read', 'projects.manage', 'tasks.read'],
      1,
      50,
      undefined,
      '   ',
    );

    expect(repository.getReport).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        canManageAll: true,
        canReadOpportunities: false,
        page: 1,
        limit: 50,
        skip: 0,
      }),
    );
    expect(repository.getReport.mock.calls[0][0]).not.toHaveProperty('search');
    expect(repository.getReport.mock.calls[0][0]).not.toHaveProperty(
      'issueType',
    );
  });
});
