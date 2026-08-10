import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  CreateUserRequest,
  PaginatedResponse,
  UserListItem,
} from '@project-ql/api-contracts';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  list(page = 1, limit = 20): Observable<PaginatedResponse<UserListItem>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<UserListItem>>('/api/v1/users', {
      params,
    });
  }

  create(input: CreateUserRequest): Observable<UserListItem> {
    return this.http.post<UserListItem>('/api/v1/users', input);
  }
}
