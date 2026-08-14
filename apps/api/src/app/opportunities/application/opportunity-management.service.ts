import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BusinessOpportunity,
  CreateOpportunityRequest,
  OpportunityListResponse,
  OpportunityRegion,
  OpportunityStage,
  UpdateOpportunityRequest,
} from '@project-ql/api-contracts';
import {
  createPagination,
  createPaginationMeta,
} from '../../core/http/pagination';
import {
  OPPORTUNITY_REPOSITORY,
  type OpportunityRepository,
  type UpdateOpportunityRecord,
} from './opportunity-management.ports';

@Injectable()
export class OpportunityManagementService {
  constructor(
    @Inject(OPPORTUNITY_REPOSITORY)
    private readonly opportunities: OpportunityRepository,
  ) {}

  async list(
    pageValue: number,
    limitValue: number,
    searchValue?: string,
    stage?: OpportunityStage,
    region?: OpportunityRegion,
    ownerValue?: string,
    feasible?: boolean,
  ): Promise<OpportunityListResponse> {
    const pagination = createPagination(pageValue, limitValue);
    const search = searchValue?.trim();
    const ownerName = ownerValue?.trim();
    const result = await this.opportunities.list({
      ...pagination,
      ...(search ? { search } : {}),
      ...(stage ? { stage } : {}),
      ...(region ? { region } : {}),
      ...(ownerName ? { ownerName } : {}),
      ...(feasible !== undefined ? { feasible } : {}),
    });
    return {
      data: result.opportunities,
      meta: createPaginationMeta(
        pagination.page,
        pagination.limit,
        result.totalItems,
      ),
      overview: result.overview,
      availableOwners: result.availableOwners,
    };
  }

  create(
    actorId: string,
    input: CreateOpportunityRequest,
  ): Promise<BusinessOpportunity> {
    return this.opportunities.create({
      name: input.name.trim(),
      region: input.region,
      ...this.optionalText('province', input.province),
      ...this.optionalText('investor', input.investor),
      ...this.optionalText('projectType', input.projectType),
      ...this.optionalText('ownerName', input.ownerName),
      stage: input.stage,
      ...(input.unitCount !== undefined ? { unitCount: input.unitCount } : {}),
      ...(input.floorAreaM2 !== undefined
        ? { floorAreaM2: input.floorAreaM2 }
        : {}),
      ...this.optionalText('note', input.note),
      feasible: input.feasible ?? false,
      ...(input.lastInteractionDate
        ? { lastInteractionDate: new Date(input.lastInteractionDate) }
        : {}),
      createdBy: actorId,
      updatedBy: actorId,
    });
  }

  async update(
    opportunityId: string,
    actorId: string,
    input: UpdateOpportunityRequest,
  ): Promise<BusinessOpportunity> {
    if (!Object.keys(input).length)
      throw new BadRequestException({
        code: 'OPPORTUNITY_UPDATE_EMPTY',
        message: 'At least one opportunity field must be provided',
      });
    const current = await this.opportunities.findById(opportunityId);
    if (!current) this.notFound();
    const update: UpdateOpportunityRecord = {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.region !== undefined ? { region: input.region } : {}),
      ...this.nullableText('province', input.province),
      ...this.nullableText('investor', input.investor),
      ...this.nullableText('projectType', input.projectType),
      ...this.nullableText('ownerName', input.ownerName),
      ...(input.stage !== undefined ? { stage: input.stage } : {}),
      ...(input.unitCount !== undefined ? { unitCount: input.unitCount } : {}),
      ...(input.floorAreaM2 !== undefined
        ? { floorAreaM2: input.floorAreaM2 }
        : {}),
      ...this.nullableText('note', input.note),
      ...(input.feasible !== undefined ? { feasible: input.feasible } : {}),
      ...(input.lastInteractionDate !== undefined
        ? {
            lastInteractionDate: input.lastInteractionDate
              ? new Date(input.lastInteractionDate)
              : null,
          }
        : {}),
      updatedBy: actorId,
    };
    const updated = await this.opportunities.update(current, update);
    if (!updated) this.notFound();
    return updated;
  }

  private optionalText<K extends string>(key: K, value?: string) {
    const normalized = value?.trim();
    return normalized ? ({ [key]: normalized } as Record<K, string>) : {};
  }

  private nullableText<K extends string>(key: K, value?: string | null) {
    if (value === undefined) return {};
    return {
      [key]: value === null ? null : value.trim(),
    } as Record<K, string | null>;
  }

  private notFound(): never {
    throw new NotFoundException({
      code: 'OPPORTUNITY_NOT_FOUND',
      message: 'Business opportunity was not found',
    });
  }
}
