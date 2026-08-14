import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  CreateReceivableRequest,
  ListReceivablesRequest,
  Receivable,
  ReceivableListResponse,
  UpdateReceivableRequest,
} from '@project-ql/api-contracts';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReceivablesService {
  private readonly http = inject(HttpClient);

  list(query: ListReceivablesRequest = {}): Observable<ReceivableListResponse> {
    let params = new HttpParams()
      .set('page', query.page ?? 1)
      .set('limit', query.limit ?? 20);
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status);
    if (query.carrier) params = params.set('carrier', query.carrier);
    if (query.projectId) params = params.set('projectId', query.projectId);
    return this.http.get<ReceivableListResponse>('/api/v1/receivables', {
      params,
    });
  }

  create(input: CreateReceivableRequest): Observable<Receivable> {
    return this.http.post<Receivable>('/api/v1/receivables', input);
  }

  update(id: string, input: UpdateReceivableRequest): Observable<Receivable> {
    return this.http.patch<Receivable>(`/api/v1/receivables/${id}`, input);
  }
}
