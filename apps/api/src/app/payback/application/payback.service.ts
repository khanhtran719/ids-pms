import { Inject, Injectable } from '@nestjs/common';
import type {
  PaybackReportResponse,
  PaybackStatus,
  PermissionCode,
} from '@project-ql/api-contracts';
import {
  createPagination,
  createPaginationMeta,
} from '../../core/http/pagination';
import { PAYBACK_REPOSITORY, type PaybackRepository } from './payback.ports';

@Injectable()
export class PaybackService {
  constructor(
    @Inject(PAYBACK_REPOSITORY)
    private readonly repository: PaybackRepository,
  ) {}

  async getReport(
    actorId: string,
    permissions: readonly PermissionCode[],
    pageValue: number,
    limitValue: number,
    fiscalYear: number,
    status?: PaybackStatus,
    searchValue?: string,
  ): Promise<PaybackReportResponse> {
    const pagination = createPagination(pageValue, limitValue);
    const search = searchValue?.trim();
    const result = await this.repository.getReport({
      ...pagination,
      actorId,
      canManageAll: permissions.includes('projects.manage'),
      fiscalYear,
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
    });
    return {
      fiscalYear,
      data: result.projects,
      meta: createPaginationMeta(
        pagination.page,
        pagination.limit,
        result.totalItems,
      ),
      overview: result.overview,
    };
  }
}
