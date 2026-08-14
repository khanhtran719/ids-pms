import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RevenueService } from './revenue.service';

describe('RevenueService', () => {
  let service: RevenueService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RevenueService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests one fiscal-year report with pagination and search', () => {
    service
      .list({ fiscalYear: 2025, page: 2, limit: 20, search: 'Riverside' })
      .subscribe();

    http
      .expectOne(
        '/api/v1/revenue?fiscalYear=2025&page=2&limit=20&search=Riverside',
      )
      .flush({ data: [], meta: {}, overview: {}, quarters: [] });
  });

  it('requests an exact project-scoped report for project detail', () => {
    service
      .list({ fiscalYear: 2025, page: 1, limit: 1, projectId: 'project-1' })
      .subscribe();

    http
      .expectOne(
        '/api/v1/revenue?fiscalYear=2025&page=1&limit=1&projectId=project-1',
      )
      .flush({ data: [], meta: {}, overview: {}, quarters: [] });
  });

  it('upserts one project quarter using PUT', () => {
    const input = {
      projectId: 'project-1',
      fiscalYear: 2025,
      quarter: 2 as const,
      revenue: 150_000_000,
      cost: 90_000_000,
    };
    service.upsert(input).subscribe();

    const request = http.expectOne('/api/v1/revenue');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(input);
    request.flush({});
  });
});
