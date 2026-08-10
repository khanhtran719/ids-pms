import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type {
  PaginatedResponse,
  UserListItem,
  UserRoleCode,
} from '@project-ql/api-contracts';
import { finalize } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { UsersService } from '../../core/users.service';

type UsersState =
  | { kind: 'loading' }
  | { kind: 'ready'; value: PaginatedResponse<UserListItem> }
  | { kind: 'error' };

@Component({
  selector: 'app-users-page',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './users.page.html',
  styleUrl: './users.page.scss',
})
export class UsersPage {
  private readonly users = inject(UsersService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthSessionStore);
  protected readonly state = signal<UsersState>({ kind: 'loading' });
  protected readonly createPanelOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly createSuccess = signal<string | null>(null);
  protected readonly form = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
      ],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email,
        Validators.maxLength(254),
      ],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(12),
        Validators.maxLength(128),
      ],
    }),
    roleCode: new FormControl<UserRoleCode>('member', { nonNullable: true }),
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set({ kind: 'loading' });
    this.users
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => this.state.set({ kind: 'ready', value }),
        error: () => this.state.set({ kind: 'error' }),
      });
  }

  protected createUser(): void {
    if (this.form.invalid || this.creating()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.createError.set(null);
    this.createSuccess.set(null);
    this.creating.set(true);
    this.users
      .create({
        displayName: value.displayName,
        email: value.email,
        password: value.password,
        roleCodes: [value.roleCode],
      })
      .pipe(
        finalize(() => this.creating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (created) => {
          const current = this.state();
          if (current.kind === 'ready') {
            this.state.set({
              kind: 'ready',
              value: {
                data: [created, ...current.value.data],
                meta: {
                  ...current.value.meta,
                  totalItems: current.value.meta.totalItems + 1,
                },
              },
            });
          }
          this.form.reset({ roleCode: 'member' });
          this.createSuccess.set(`Đã tạo tài khoản ${created.email}.`);
          this.createPanelOpen.set(false);
        },
        error: () =>
          this.createError.set(
            'Không thể tạo tài khoản. Kiểm tra email và thử lại.',
          ),
      });
  }
}
