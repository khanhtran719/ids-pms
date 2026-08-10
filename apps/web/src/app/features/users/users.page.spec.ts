import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type {
  PaginatedResponse,
  UserListItem,
} from '@project-ql/api-contracts';
import { Subject } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { UsersService } from '../../core/users.service';
import { UsersPage } from './users.page';

const EMPTY_PAGE: PaginatedResponse<UserListItem> = {
  data: [],
  meta: {
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const CREATED_USER: UserListItem = {
  id: 'user-2',
  email: 'member@example.com',
  displayName: 'New Member',
  status: 'active',
  roleCodes: ['member'],
  createdAt: '2026-08-10T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
};

describe('UsersPage', () => {
  let listResponse: Subject<PaginatedResponse<UserListItem>>;
  let createResponse: Subject<UserListItem>;
  let users: { list: jest.Mock; create: jest.Mock };

  beforeEach(async () => {
    listResponse = new Subject();
    createResponse = new Subject();
    users = {
      list: jest.fn(() => listResponse),
      create: jest.fn(() => createResponse),
    };
    await TestBed.configureTestingModule({
      imports: [UsersPage],
      providers: [{ provide: UsersService, useValue: users }],
    }).compileComponents();
  });

  function setSession(canManage: boolean): void {
    TestBed.inject(AuthSessionStore).setSession({
      accessToken: 'token',
      expiresInSeconds: 900,
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        displayName: 'Administrator',
        status: 'active',
        roleCodes: [canManage ? 'admin' : 'member'],
        permissions: canManage
          ? ['users.read', 'users.manage']
          : ['users.read'],
      },
    });
  }

  function fill(
    fixture: ComponentFixture<UsersPage>,
    selector: string,
    value: string,
  ): void {
    const control = fixture.nativeElement.querySelector(selector) as
      | HTMLInputElement
      | HTMLSelectElement;
    control.value = value;
    control.dispatchEvent(
      new Event(control instanceof HTMLSelectElement ? 'change' : 'input'),
    );
    fixture.detectChanges();
  }

  it('renders loading, empty and error states with a retry action', () => {
    setSession(true);
    const fixture = TestBed.createComponent(UsersPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Đang tải danh sách người dùng',
    );

    listResponse.next(EMPTY_PAGE);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Chưa có người dùng nào',
    );

    const retryResponse = new Subject<PaginatedResponse<UserListItem>>();
    users.list.mockReturnValue(retryResponse);
    listResponse.error(new Error('network'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Không thể tải danh sách',
    );

    fixture.nativeElement.querySelector('.state--error button').click();
    retryResponse.next({ ...EMPTY_PAGE, data: [CREATED_USER] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('member@example.com');
    expect(users.list).toHaveBeenCalledTimes(2);
  });

  it('hides account creation from users without manage permission', () => {
    setSession(false);
    const fixture = TestBed.createComponent(UsersPage);
    listResponse.next(EMPTY_PAGE);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Thêm người dùng');
  });

  it('validates and prepends a newly created account', () => {
    setSession(true);
    const fixture = TestBed.createComponent(UsersPage);
    listResponse.next(EMPTY_PAGE);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('header button').click();
    fixture.detectChanges();
    const submit = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    fill(fixture, '#displayName', 'New Member');
    fill(fixture, '#newUserEmail', 'member@example.com');
    fill(fixture, '#newUserPassword', 'temporary-password-123');
    fill(fixture, '#roleCode', 'member');
    expect(submit.disabled).toBe(false);
    submit.click();

    expect(users.create).toHaveBeenCalledWith({
      displayName: 'New Member',
      email: 'member@example.com',
      password: 'temporary-password-123',
      roleCodes: ['member'],
    });
    createResponse.next(CREATED_USER);
    createResponse.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Đã tạo tài khoản member@example.com',
    );
    expect(fixture.nativeElement.textContent).toContain('1 tài khoản');
    expect(fixture.nativeElement.querySelector('.create-card')).toBeNull();
  });

  it('shows a safe creation error and restores the submit state', () => {
    setSession(true);
    const fixture = TestBed.createComponent(UsersPage);
    listResponse.next(EMPTY_PAGE);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('header button').click();
    fixture.detectChanges();

    fill(fixture, '#displayName', 'New Member');
    fill(fixture, '#newUserEmail', 'member@example.com');
    fill(fixture, '#newUserPassword', 'temporary-password-123');
    const submit = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    submit.click();
    createResponse.error(new Error('database details'));
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain('Không thể tạo tài khoản');
    expect(fixture.nativeElement.textContent).not.toContain('database details');
    expect(submit.disabled).toBe(false);
  });
});
