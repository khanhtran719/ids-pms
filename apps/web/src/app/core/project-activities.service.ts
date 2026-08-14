import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  CreateProjectCommentRequest,
  ProjectActivity,
  ProjectActivityListResponse,
} from '@project-ql/api-contracts';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProjectActivitiesService {
  private readonly http = inject(HttpClient);

  list(
    projectId: string,
    page = 1,
    limit = 20,
  ): Observable<ProjectActivityListResponse> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<ProjectActivityListResponse>(
      `/api/v1/projects/${projectId}/activities`,
      { params },
    );
  }

  createComment(
    projectId: string,
    input: CreateProjectCommentRequest,
  ): Observable<ProjectActivity> {
    return this.http.post<ProjectActivity>(
      `/api/v1/projects/${projectId}/activities/comments`,
      input,
    );
  }
}
