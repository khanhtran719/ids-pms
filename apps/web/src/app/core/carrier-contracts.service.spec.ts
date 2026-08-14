import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CarrierContractsService } from './carrier-contracts.service';

describe('CarrierContractsService', () => {
  let service: CarrierContractsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CarrierContractsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends one paginated request with carrier and service filters', () => {
    service
      .list({ page: 2, limit: 20, carrier: 'Viettel', serviceType: 'teldata' })
      .subscribe();

    http
      .expectOne(
        '/api/v1/carrier-contracts?page=2&limit=20&carrier=Viettel&serviceType=teldata',
      )
      .flush({ data: [], meta: {}, overview: {}, availableCarriers: [] });
  });

  it('creates and updates carrier contract terms', () => {
    service
      .create({
        projectId: 'project-1',
        carrier: 'VNPT',
        serviceType: 'ibs',
        quantity: 2_000,
      })
      .subscribe();
    const create = http.expectOne('/api/v1/carrier-contracts');
    expect(create.request.method).toBe('POST');
    create.flush({});

    service.update('contract-1', { unitPrice: 50_000 }).subscribe();
    const update = http.expectOne('/api/v1/carrier-contracts/contract-1');
    expect(update.request.method).toBe('PATCH');
    update.flush({});
  });
});
