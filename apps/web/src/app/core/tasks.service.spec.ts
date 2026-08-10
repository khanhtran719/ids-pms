import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TasksService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists tasks with bounded pagination and optional filters', () => {
    service.list(2, 50, 'project-1', 'in_progress').subscribe();

    const request = http.expectOne(
      '/api/v1/tasks?page=2&limit=50&projectId=project-1&status=in_progress',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], meta: {}, overview: {} });
  });

  it('initializes and updates task plans through their public contracts', () => {
    service.initializePlan('project-1').subscribe();
    service
      .update('task-1', {
        status: 'done',
        actualEndDate: '2026-08-10',
      })
      .subscribe();

    expect(
      http.expectOne('/api/v1/projects/project-1/tasks/initialize').request
        .method,
    ).toBe('POST');
    const update = http.expectOne('/api/v1/tasks/task-1');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({
      status: 'done',
      actualEndDate: '2026-08-10',
    });
  });
});
