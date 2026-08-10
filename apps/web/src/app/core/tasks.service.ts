import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ProjectTask,
  TaskListResponse,
  TaskStatus,
  UpdateTaskRequest,
} from '@project-ql/api-contracts';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);

  list(
    page = 1,
    limit = 50,
    projectId?: string,
    status?: TaskStatus,
  ): Observable<TaskListResponse> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (projectId) params = params.set('projectId', projectId);
    if (status) params = params.set('status', status);
    return this.http.get<TaskListResponse>('/api/v1/tasks', { params });
  }

  initializePlan(projectId: string): Observable<ProjectTask[]> {
    return this.http.post<ProjectTask[]>(
      `/api/v1/projects/${projectId}/tasks/initialize`,
      {},
    );
  }

  update(
    taskId: string,
    input: UpdateTaskRequest,
  ): Observable<ProjectTask> {
    return this.http.patch<ProjectTask>(`/api/v1/tasks/${taskId}`, input);
  }
}
