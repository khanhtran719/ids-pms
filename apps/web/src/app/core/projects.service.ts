import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  CreateProjectRequest,
  PaginatedResponse,
  ProjectDetail,
  ProjectMember,
  ProjectMemberCandidate,
  ProjectStatus,
  UpdateProjectRequest,
  UpsertProjectMemberRequest,
} from '@project-ql/api-contracts';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);

  list(
    page = 1,
    limit = 20,
    status?: ProjectStatus,
  ): Observable<PaginatedResponse<ProjectDetail>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (status) params = params.set('status', status);
    return this.http.get<PaginatedResponse<ProjectDetail>>('/api/v1/projects', {
      params,
    });
  }

  create(input: CreateProjectRequest): Observable<ProjectDetail> {
    return this.http.post<ProjectDetail>('/api/v1/projects', input);
  }

  getById(projectId: string): Observable<ProjectDetail> {
    return this.http.get<ProjectDetail>(`/api/v1/projects/${projectId}`);
  }

  update(
    projectId: string,
    input: UpdateProjectRequest,
  ): Observable<ProjectDetail> {
    return this.http.patch<ProjectDetail>(
      `/api/v1/projects/${projectId}`,
      input,
    );
  }

  listMembers(projectId: string): Observable<ProjectMember[]> {
    return this.http.get<ProjectMember[]>(
      `/api/v1/projects/${projectId}/members`,
    );
  }

  listMemberCandidates(
    projectId: string,
    search?: string,
    limit = 20,
  ): Observable<ProjectMemberCandidate[]> {
    let params = new HttpParams().set('limit', limit);
    if (search) params = params.set('search', search);
    return this.http.get<ProjectMemberCandidate[]>(
      `/api/v1/projects/${projectId}/member-candidates`,
      { params },
    );
  }

  upsertMember(
    projectId: string,
    input: UpsertProjectMemberRequest,
  ): Observable<ProjectMember> {
    return this.http.post<ProjectMember>(
      `/api/v1/projects/${projectId}/members`,
      input,
    );
  }

  removeMember(projectId: string, userId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/v1/projects/${projectId}/members/${userId}`,
    );
  }
}
