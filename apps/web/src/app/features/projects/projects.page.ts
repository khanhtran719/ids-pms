import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type {
  PaginatedResponse,
  ProjectDetail,
  ProjectStatus,
} from '@project-ql/api-contracts';
import { distinctUntilChanged, finalize } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { ProjectsService } from '../../core/projects.service';

type ProjectsState =
  | { kind: 'loading' }
  | { kind: 'ready'; value: PaginatedResponse<ProjectDetail> }
  | { kind: 'error' };

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Lập kế hoạch',
  active: 'Đang thực hiện',
  on_hold: 'Tạm dừng',
  completed: 'Hoàn thành',
  archived: 'Lưu trữ',
};

@Component({
  selector: 'app-projects-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './projects.page.html',
  styleUrl: './projects.page.scss',
})
export class ProjectsPage {
  private readonly projects = inject(ProjectsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthSessionStore);
  protected readonly state = signal<ProjectsState>({ kind: 'loading' });
  protected readonly createPanelOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly statusFilter = new FormControl<ProjectStatus | ''>('', {
    nonNullable: true,
  });
  protected readonly createForm = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(24),
        Validators.pattern(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
      ],
    }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(160),
      ],
    }),
    description: new FormControl('', { nonNullable: true }),
    status: new FormControl<ProjectStatus>('planning', { nonNullable: true }),
    startDate: new FormControl('', { nonNullable: true }),
    dueDate: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    this.load();
    this.statusFilter.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.load());
  }

  protected load(): void {
    this.state.set({ kind: 'loading' });
    this.projects
      .list(1, 20, this.statusFilter.value || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => this.state.set({ kind: 'ready', value }),
        error: () => this.state.set({ kind: 'error' }),
      });
  }

  protected createProject(): void {
    if (this.createForm.invalid || this.creating()) {
      this.createForm.markAllAsTouched();
      return;
    }
    const value = this.createForm.getRawValue();
    this.creating.set(true);
    this.createError.set(null);
    this.projects
      .create({
        code: value.code,
        name: value.name,
        ...(value.description ? { description: value.description } : {}),
        status: value.status,
        ...(value.startDate ? { startDate: value.startDate } : {}),
        ...(value.dueDate ? { dueDate: value.dueDate } : {}),
      })
      .pipe(
        finalize(() => this.creating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (project) => void this.router.navigate(['/projects', project.id]),
        error: () =>
          this.createError.set(
            'Không thể tạo dự án. Kiểm tra mã dự án và thử lại.',
          ),
      });
  }

  protected statusLabel(status: ProjectStatus): string {
    return STATUS_LABELS[status];
  }
}
