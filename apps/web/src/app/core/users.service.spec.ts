import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('requests one paginated users query', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(UsersService);
    const http = TestBed.inject(HttpTestingController);

    service.list(2, 20).subscribe();

    expect(http.expectOne('/api/v1/users?page=2&limit=20').request.method).toBe(
      'GET',
    );
    http.verify();
  });
});
