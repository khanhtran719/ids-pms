import type {
  BusinessOpportunity,
  OpportunityOverview,
  OpportunityRegion,
  OpportunityStage,
} from '@project-ql/api-contracts';
import type { Pagination } from '../../core/http/pagination';

export interface ListOpportunitiesQuery extends Pagination {
  search?: string;
  stage?: OpportunityStage;
  region?: OpportunityRegion;
  ownerName?: string;
  feasible?: boolean;
}

export interface CreateOpportunityRecord {
  name: string;
  region: OpportunityRegion;
  province?: string;
  investor?: string;
  projectType?: string;
  ownerName?: string;
  stage: OpportunityStage;
  unitCount?: number;
  floorAreaM2?: number;
  note?: string;
  feasible: boolean;
  lastInteractionDate?: Date;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateOpportunityRecord {
  name?: string;
  region?: OpportunityRegion;
  province?: string | null;
  investor?: string | null;
  projectType?: string | null;
  ownerName?: string | null;
  stage?: OpportunityStage;
  unitCount?: number | null;
  floorAreaM2?: number | null;
  note?: string | null;
  feasible?: boolean;
  lastInteractionDate?: Date | null;
  updatedBy: string;
}

export interface OpportunityRepository {
  list(query: ListOpportunitiesQuery): Promise<{
    opportunities: BusinessOpportunity[];
    totalItems: number;
    overview: OpportunityOverview;
    availableOwners: string[];
  }>;
  create(input: CreateOpportunityRecord): Promise<BusinessOpportunity>;
  findById(id: string): Promise<BusinessOpportunity | null>;
  update(
    opportunity: BusinessOpportunity,
    input: UpdateOpportunityRecord,
  ): Promise<BusinessOpportunity | null>;
}

export const OPPORTUNITY_REPOSITORY = Symbol('OPPORTUNITY_REPOSITORY');
