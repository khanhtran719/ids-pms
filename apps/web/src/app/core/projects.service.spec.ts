import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProjectsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists projects with the IDS portfolio filters', () => {
    service
      .list({
        page: 2,
        limit: 20,
        operationalStatus: 'operational',
        dataQuality: 'missing_capex',
        search: 'Nam Long',
      })
      .subscribe();

    const request = http.expectOne(
      '/api/v1/projects?page=2&limit=20&operationalStatus=operational&dataQuality=missing_capex&search=Nam%20Long',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], meta: {} });
  });

  it('loads project and membership resources without per-member requests', () => {
    service.getById('project-1').subscribe();
    service.listMembers('project-1').subscribe();

    expect(http.expectOne('/api/v1/projects/project-1').request.method).toBe(
      'GET',
    );
    expect(
      http.expectOne('/api/v1/projects/project-1/members').request.method,
    ).toBe('GET');
  });

  it('uses the membership upsert and delete contracts', () => {
    service
      .upsertMember('project-1', { userId: 'user-2', role: 'manager' })
      .subscribe();
    service.removeMember('project-1', 'user-2').subscribe();

    const upsert = http.expectOne('/api/v1/projects/project-1/members');
    expect(upsert.request.method).toBe('POST');
    expect(upsert.request.body).toEqual({
      userId: 'user-2',
      role: 'manager',
    });
    expect(
      http.expectOne('/api/v1/projects/project-1/members/user-2').request
        .method,
    ).toBe('DELETE');
  });

  it('loads a bounded project member candidate directory', () => {
    service.listMemberCandidates('project-1', 'mai', 20).subscribe();

    expect(
      http.expectOne(
        '/api/v1/projects/project-1/member-candidates?limit=20&search=mai',
      ).request.method,
    ).toBe('GET');
  });
});
