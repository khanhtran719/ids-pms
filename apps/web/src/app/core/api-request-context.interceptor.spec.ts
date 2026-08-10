import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  apiRequestContextInterceptor,
  CLIENT_REQUEST_ID_FACTORY,
} from './api-request-context.interceptor';

describe('apiRequestContextInterceptor', () => {
  it('adds JSON and correlation headers to API requests', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiRequestContextInterceptor])),
        provideHttpClientTesting(),
        {
          provide: CLIENT_REQUEST_ID_FACTORY,
          useValue: () => 'client-request-123',
        },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const client = TestBed.inject(HttpClient);

    client.get('/api/v1/health').subscribe();

    const request = http.expectOne('/api/v1/health');
    expect(request.request.headers.get('Accept')).toBe('application/json');
    expect(request.request.headers.get('X-Request-Id')).toBe(
      'client-request-123',
    );
    request.flush({});
    http.verify();
  });
});
