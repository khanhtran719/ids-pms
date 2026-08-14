import type { DashboardResponse } from '@project-ql/api-contracts';

export interface DashboardSnapshotQuery {
  actorId: string;
  canManageAll: boolean;
  fiscalYear: number;
  asOf: Date;
}

export interface DashboardRepository {
  getSnapshot(query: DashboardSnapshotQuery): Promise<DashboardResponse>;
}

export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');
