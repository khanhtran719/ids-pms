import type {
  PaybackOverview,
  PaybackProjectSummary,
  PaybackStatus,
} from '@project-ql/api-contracts';
import type { Pagination } from '../../core/http/pagination';

export interface PaybackReportQuery extends Pagination {
  actorId: string;
  canManageAll: boolean;
  fiscalYear: number;
  status?: PaybackStatus;
  search?: string;
}

export interface PaybackRepository {
  getReport(query: PaybackReportQuery): Promise<{
    projects: PaybackProjectSummary[];
    totalItems: number;
    overview: PaybackOverview;
  }>;
}

export const PAYBACK_REPOSITORY = Symbol('PAYBACK_REPOSITORY');
