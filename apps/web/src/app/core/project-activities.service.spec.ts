import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProjectActivitiesService } from './project-activities.service';

describe('ProjectActivitiesService', () => {
  let service: ProjectActivitiesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProjectActivitiesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads one paginated project timeline', () => {
    service.list('project-1', 2, 20).subscribe();

    const request = http.expectOne(
      '/api/v1/projects/project-1/activities?page=2&limit=20',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], meta: {} });
  });

  it('uses bounded first-page defaults', () => {
    service.list('project-1').subscribe();

    expect(
      http.expectOne('/api/v1/projects/project-1/activities?page=1&limit=20')
        .request.method,
    ).toBe('GET');
  });

  it('posts a project comment using the activity contract', () => {
    service
      .createComment('project-1', { content: 'Đã xác nhận mặt bằng.' })
      .subscribe();

    const request = http.expectOne(
      '/api/v1/projects/project-1/activities/comments',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      content: 'Đã xác nhận mặt bằng.',
    });
    request.flush({});
  });
});
