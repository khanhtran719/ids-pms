import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  BusinessOpportunity,
  CreateOpportunityRequest,
  ListOpportunitiesRequest,
  OpportunityListResponse,
  UpdateOpportunityRequest,
} from '@project-ql/api-contracts';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OpportunitiesService {
  private readonly http = inject(HttpClient);

  list(
    query: ListOpportunitiesRequest = {},
  ): Observable<OpportunityListResponse> {
    let params = new HttpParams()
      .set('page', query.page ?? 1)
      .set('limit', query.limit ?? 20);
    if (query.search) params = params.set('search', query.search);
    if (query.stage) params = params.set('stage', query.stage);
    if (query.region) params = params.set('region', query.region);
    if (query.ownerName) params = params.set('ownerName', query.ownerName);
    if (query.feasible !== undefined)
      params = params.set('feasible', query.feasible);
    return this.http.get<OpportunityListResponse>('/api/v1/opportunities', {
      params,
    });
  }

  create(input: CreateOpportunityRequest): Observable<BusinessOpportunity> {
    return this.http.post<BusinessOpportunity>('/api/v1/opportunities', input);
  }

  update(
    id: string,
    input: UpdateOpportunityRequest,
  ): Observable<BusinessOpportunity> {
    return this.http.patch<BusinessOpportunity>(
      `/api/v1/opportunities/${id}`,
      input,
    );
  }
}
