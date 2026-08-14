import { Inject, Injectable } from '@nestjs/common';
import type {
  DashboardResponse,
  PermissionCode,
} from '@project-ql/api-contracts';
import {
  DASHBOARD_REPOSITORY,
  type DashboardRepository,
} from './dashboard.ports';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly repository: DashboardRepository,
  ) {}

  getSnapshot(
    actorId: string,
    permissions: readonly PermissionCode[],
    fiscalYear: number,
  ): Promise<DashboardResponse> {
    return this.repository.getSnapshot({
      actorId,
      canManageAll: permissions.includes('projects.manage'),
      canReadOpportunities: permissions.includes('opportunities.read'),
      fiscalYear,
      asOf: new Date(),
    });
  }
}
