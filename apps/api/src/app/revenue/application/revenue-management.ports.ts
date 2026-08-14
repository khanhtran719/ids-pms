import type {
  FiscalQuarter,
  RevenueActual,
  RevenueOverview,
  RevenueProjectSummary,
  RevenueQuarterSummary,
} from '@project-ql/api-contracts';
import type { Pagination } from '../../core/http/pagination';

export interface RevenueProjectAccess {
  id: string;
  code: string;
  name: string;
}

export interface ListRevenueQuery extends Pagination {
  actorId: string;
  canManageAll: boolean;
  fiscalYear: number;
  search?: string;
}

export interface UpsertRevenueActualRecord {
  projectId: string;
  projectCode: string;
  projectName: string;
  fiscalYear: number;
  quarter: FiscalQuarter;
  revenue: number;
  cost: number;
  actorId: string;
}

export interface RevenueActualRepository {
  getReport(query: ListRevenueQuery): Promise<{
    projects: RevenueProjectSummary[];
    totalItems: number;
    overview: RevenueOverview;
    quarters: RevenueQuarterSummary[];
  }>;
  upsert(input: UpsertRevenueActualRecord): Promise<RevenueActual>;
}

export interface RevenueProjectDirectory {
  findByIdWithAccess(
    projectId: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<RevenueProjectAccess | null>;
}

export const REVENUE_ACTUAL_REPOSITORY = Symbol('REVENUE_ACTUAL_REPOSITORY');
export const REVENUE_PROJECT_DIRECTORY = Symbol('REVENUE_PROJECT_DIRECTORY');
