import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  CarrierContract,
  CarrierContractListResponse,
  CreateCarrierContractRequest,
  ListCarrierContractsRequest,
  UpdateCarrierContractRequest,
} from '@project-ql/api-contracts';
import type { Observable } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class CarrierContractsService {
  private readonly http = inject(HttpClient);
  list(
    query: ListCarrierContractsRequest = {},
  ): Observable<CarrierContractListResponse> {
    let params = new HttpParams()
      .set('page', query.page ?? 1)
      .set('limit', query.limit ?? 20);
    if (query.projectId) params = params.set('projectId', query.projectId);
    if (query.carrier) params = params.set('carrier', query.carrier);
    if (query.serviceType)
      params = params.set('serviceType', query.serviceType);
    return this.http.get<CarrierContractListResponse>(
      '/api/v1/carrier-contracts',
      { params },
    );
  }
  create(input: CreateCarrierContractRequest): Observable<CarrierContract> {
    return this.http.post<CarrierContract>('/api/v1/carrier-contracts', input);
  }
  update(
    id: string,
    input: UpdateCarrierContractRequest,
  ): Observable<CarrierContract> {
    return this.http.patch<CarrierContract>(
      `/api/v1/carrier-contracts/${id}`,
      input,
    );
  }
}
