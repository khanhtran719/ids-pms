import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReceivablesService } from './receivables.service';

describe('ReceivablesService', () => {
  let service: ReceivablesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReceivablesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists receivables using portfolio filters', () => {
    service
      .list({
        page: 2,
        limit: 20,
        search: 'Eco Green',
        status: 'overdue',
        carrier: 'Viettel',
      })
      .subscribe();

    expect(
      http.expectOne(
        '/api/v1/receivables?page=2&limit=20&search=Eco%20Green&status=overdue&carrier=Viettel',
      ).request.method,
    ).toBe('GET');
  });

  it('creates and updates manual collection records', () => {
    service
      .create({
        carrierContractId: 'contract-1',
        periodLabel: 'Q3/2026',
        amountDue: 100,
        dueDate: '2026-08-01',
      })
      .subscribe();
    service
      .update('receivable-1', {
        amountPaid: 100,
        paidDate: '2026-07-20',
      })
      .subscribe();

    expect(http.expectOne('/api/v1/receivables').request.method).toBe('POST');
    expect(
      http.expectOne('/api/v1/receivables/receivable-1').request.method,
    ).toBe('PATCH');
  });
});
