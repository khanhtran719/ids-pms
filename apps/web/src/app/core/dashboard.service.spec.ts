import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('loads one fiscal-year dashboard snapshot', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(DashboardService);
    const http = TestBed.inject(HttpTestingController);

    service.getSnapshot(2025).subscribe();

    const request = http.expectOne('/api/v1/dashboard?fiscalYear=2025');
    expect(request.request.method).toBe('GET');
    request.flush({});
    http.verify();
  });
});
