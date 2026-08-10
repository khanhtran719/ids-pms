import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DataQualityService } from './data-quality.service';

describe('DataQualityService', () => {
  let service: DataQualityService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DataQualityService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads one bounded report request with optional filters', () => {
    service
      .getReport({
        page: 2,
        limit: 20,
        issueType: 'overdue_task',
        search: 'Riverside',
      })
      .subscribe();

    const request = http.expectOne(
      '/api/v1/data-quality?page=2&limit=20&issueType=overdue_task&search=Riverside',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], meta: {}, summary: {} });
  });

  it('uses default pagination without sending empty filters', () => {
    service.getReport().subscribe();

    const request = http.expectOne('/api/v1/data-quality?page=1&limit=20');
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], meta: {}, summary: {} });
  });
});
