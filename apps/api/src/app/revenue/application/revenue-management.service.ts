import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  PermissionCode,
  RevenueActual,
  RevenueReportResponse,
  UpsertRevenueActualRequest,
} from '@project-ql/api-contracts';
import {
  createPagination,
  createPaginationMeta,
} from '../../core/http/pagination';
import {
  REVENUE_ACTUAL_REPOSITORY,
  REVENUE_PROJECT_DIRECTORY,
  type RevenueActualRepository,
  type RevenueProjectDirectory,
} from './revenue-management.ports';

@Injectable()
export class RevenueManagementService {
  constructor(
    @Inject(REVENUE_ACTUAL_REPOSITORY)
    private readonly actuals: RevenueActualRepository,
    @Inject(REVENUE_PROJECT_DIRECTORY)
    private readonly projects: RevenueProjectDirectory,
  ) {}

  async list(
    actorId: string,
    permissions: readonly PermissionCode[],
    pageValue: number,
    limitValue: number,
    fiscalYear: number,
    searchValue?: string,
  ): Promise<RevenueReportResponse> {
    const pagination = createPagination(pageValue, limitValue);
    const search = searchValue?.trim();
    const report = await this.actuals.getReport({
      ...pagination,
      actorId,
      canManageAll: permissions.includes('projects.manage'),
      fiscalYear,
      ...(search ? { search } : {}),
    });
    return {
      data: report.projects,
      meta: createPaginationMeta(
        pagination.page,
        pagination.limit,
        report.totalItems,
      ),
      fiscalYear,
      overview: report.overview,
      quarters: report.quarters,
    };
  }

  async upsert(
    actorId: string,
    permissions: readonly PermissionCode[],
    input: UpsertRevenueActualRequest,
  ): Promise<RevenueActual> {
    const project = await this.projects.findByIdWithAccess(
      input.projectId,
      actorId,
      permissions.includes('projects.manage'),
    );
    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project was not found',
      });
    }
    return this.actuals.upsert({
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      fiscalYear: input.fiscalYear,
      quarter: input.quarter,
      revenue: input.revenue,
      cost: input.cost,
      actorId,
    });
  }
}
