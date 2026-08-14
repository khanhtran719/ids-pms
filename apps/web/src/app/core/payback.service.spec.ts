import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PaybackService } from './payback.service';

describe('PaybackService', () => {
  let service: PaybackService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PaybackService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the paginated fiscal-year report with optional filters', () => {
    service
      .getReport({
        fiscalYear: 2025,
        page: 2,
        limit: 20,
        status: 'paid_back',
        search: 'Riverside',
      })
      .subscribe();

    const request = http.expectOne(
      '/api/v1/payback?fiscalYear=2025&page=2&limit=20&status=paid_back&search=Riverside',
    );
    expect(request.request.method).toBe('GET');
    request.flush({});
  });
});
