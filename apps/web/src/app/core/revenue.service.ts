import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ListRevenueRequest,
  RevenueActual,
  RevenueReportResponse,
  UpsertRevenueActualRequest,
} from '@project-ql/api-contracts';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RevenueService {
  private readonly http = inject(HttpClient);

  list(query: ListRevenueRequest): Observable<RevenueReportResponse> {
    let params = new HttpParams()
      .set('fiscalYear', query.fiscalYear)
      .set('page', query.page ?? 1)
      .set('limit', query.limit ?? 20);
    if (query.search) params = params.set('search', query.search);
    if (query.projectId) params = params.set('projectId', query.projectId);
    return this.http.get<RevenueReportResponse>('/api/v1/revenue', { params });
  }

  upsert(input: UpsertRevenueActualRequest): Observable<RevenueActual> {
    return this.http.put<RevenueActual>('/api/v1/revenue', input);
  }
}
