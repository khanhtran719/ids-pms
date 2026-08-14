import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OpportunitiesService } from './opportunities.service';

describe('OpportunitiesService', () => {
  let service: OpportunitiesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OpportunitiesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends one paginated request with pipeline filters', () => {
    service
      .list({
        page: 2,
        limit: 20,
        search: 'IDS',
        stage: 3,
        region: 'south',
        ownerName: 'Chị Lan',
        feasible: true,
      })
      .subscribe();

    http
      .expectOne(
        '/api/v1/opportunities?page=2&limit=20&search=IDS&stage=3&region=south&ownerName=Ch%E1%BB%8B%20Lan&feasible=true',
      )
      .flush({ data: [], meta: {}, overview: {}, availableOwners: [] });
  });

  it('creates and updates opportunities', () => {
    service
      .create({ name: 'IDS Riverside', region: 'south', stage: 1 })
      .subscribe();
    expect(http.expectOne('/api/v1/opportunities').request.method).toBe('POST');

    service.update('opportunity-1', { stage: 2 }).subscribe();
    expect(
      http.expectOne('/api/v1/opportunities/opportunity-1').request.method,
    ).toBe('PATCH');
  });
});
