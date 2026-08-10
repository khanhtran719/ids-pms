import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  DataQualityReportResponse,
  ListDataQualityRequest,
} from '@project-ql/api-contracts';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataQualityService {
  private readonly http = inject(HttpClient);

  getReport(
    request: ListDataQualityRequest = {},
  ): Observable<DataQualityReportResponse> {
    let params = new HttpParams()
      .set('page', request.page ?? 1)
      .set('limit', request.limit ?? 20);
    if (request.issueType) {
      params = params.set('issueType', request.issueType);
    }
    if (request.search) params = params.set('search', request.search);
    return this.http.get<DataQualityReportResponse>('/api/v1/data-quality', {
      params,
    });
  }
}
