import type {
  DataQualityIssueType,
  DataQualityProjectIssue,
  DataQualitySummary,
  OpportunityDataQualitySummary,
} from '@project-ql/api-contracts';
import type { Pagination } from '../../core/http/pagination';

export interface DataQualityReportQuery extends Pagination {
  actorId: string;
  canManageAll: boolean;
  canReadOpportunities: boolean;
  asOf: Date;
  issueType?: DataQualityIssueType;
  search?: string;
}

export interface DataQualityRepository {
  getReport(query: DataQualityReportQuery): Promise<{
    issues: DataQualityProjectIssue[];
    totalItems: number;
    summary: DataQualitySummary;
    opportunityQuality?: OpportunityDataQualitySummary;
  }>;
}

export const DATA_QUALITY_REPOSITORY = Symbol('DATA_QUALITY_REPOSITORY');
