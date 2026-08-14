import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ListPaybackRequest,
  PaybackReportResponse,
} from '@project-ql/api-contracts';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PaybackService {
  private readonly http = inject(HttpClient);

  getReport(request: ListPaybackRequest): Observable<PaybackReportResponse> {
    let params = new HttpParams()
      .set('fiscalYear', request.fiscalYear)
      .set('page', request.page ?? 1)
      .set('limit', request.limit ?? 20);
    if (request.status) params = params.set('status', request.status);
    if (request.search) params = params.set('search', request.search);
    return this.http.get<PaybackReportResponse>('/api/v1/payback', { params });
  }
}
