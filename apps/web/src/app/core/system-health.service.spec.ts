import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SystemHealthService } from './system-health.service';

describe('SystemHealthService', () => {
  let service: SystemHealthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(SystemHealthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the system status from the versioned health endpoint', () => {
    const response = {
      status: 'ok' as const,
      services: {
        api: 'up' as const,
        database: 'up' as const,
      },
      timestamp: '2026-08-10T00:00:00.000Z',
    };

    service.getStatus().subscribe((result) => expect(result).toEqual(response));

    const request = http.expectOne('/api/v1/health');
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });
});
