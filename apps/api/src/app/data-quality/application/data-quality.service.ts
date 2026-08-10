import { Inject, Injectable } from '@nestjs/common';
import type {
  DataQualityIssueType,
  DataQualityReportResponse,
  PermissionCode,
} from '@project-ql/api-contracts';
import {
  createPagination,
  createPaginationMeta,
} from '../../core/http/pagination';
import {
  DATA_QUALITY_REPOSITORY,
  type DataQualityRepository,
} from './data-quality.ports';

@Injectable()
export class DataQualityService {
  constructor(
    @Inject(DATA_QUALITY_REPOSITORY)
    private readonly repository: DataQualityRepository,
  ) {}

  async getReport(
    actorId: string,
    permissions: readonly PermissionCode[],
    pageValue: number,
    limitValue: number,
    issueType?: DataQualityIssueType,
    searchValue?: string,
  ): Promise<DataQualityReportResponse> {
    const pagination = createPagination(pageValue, limitValue);
    const search = searchValue?.trim();
    const result = await this.repository.getReport({
      ...pagination,
      actorId,
      canManageAll: permissions.includes('projects.manage'),
      asOf: new Date(),
      ...(issueType ? { issueType } : {}),
      ...(search ? { search } : {}),
    });
    return {
      data: result.issues,
      meta: createPaginationMeta(
        pagination.page,
        pagination.limit,
        result.totalItems,
      ),
      summary: result.summary,
    };
  }
}
