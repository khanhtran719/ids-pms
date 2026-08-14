import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { DashboardResponse } from '@project-ql/api-contracts';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getSnapshot(fiscalYear: number): Observable<DashboardResponse> {
    const params = new HttpParams().set('fiscalYear', fiscalYear);
    return this.http.get<DashboardResponse>('/api/v1/dashboard', { params });
  }
}
