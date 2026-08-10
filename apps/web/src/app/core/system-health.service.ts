import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { SystemHealth } from '@project-ql/api-contracts';

export type { SystemHealth } from '@project-ql/api-contracts';

@Injectable({ providedIn: 'root' })
export class SystemHealthService {
  private readonly http = inject(HttpClient);

  getStatus() {
    return this.http.get<SystemHealth>('/api/v1/health');
  }
}
