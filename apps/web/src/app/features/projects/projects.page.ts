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
  ProjectDataQualityFilter,
  ProjectDetail,
  ProjectOperationalStatus,
  ProjectStatus,
} from '@project-ql/api-contracts';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { ProjectsService } from '../../core/projects.service';

type ProjectsState =
  | { kind: 'loading' }
  | { kind: 'ready'; value: PaginatedResponse<ProjectDetail> }
  | { kind: 'error' };

const OPERATIONAL_STATUS_LABELS: Record<ProjectOperationalStatus, string> = {
  not_started: 'Chưa thi công',
  in_progress: 'Đang thi công',
  partial: 'Hoàn thành theo GĐ',
  operational: 'Đang khai thác',
};

@Component({
  selector: 'app-projects-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './projects.page.html',
  styleUrl: './projects.page.scss',
})
export class ProjectsPage {
  private readonly projects = inject(ProjectsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loadRequests = new Subject<number>();
  protected readonly auth = inject(AuthSessionStore);
  protected readonly state = signal<ProjectsState>({ kind: 'loading' });
  protected readonly createPanelOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly currentPage = signal(1);
  protected readonly searchFilter = new FormControl('', {
    nonNullable: true,
  });
  protected readonly operationalStatusFilter = new FormControl<
    ProjectOperationalStatus | ''
  >('', { nonNullable: true });
  protected readonly dataQualityFilter = new FormControl<
    ProjectDataQualityFilter | ''
  >('', { nonNullable: true });
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
    operationalStatus: new FormControl<ProjectOperationalStatus>(
      'not_started',
      { nonNullable: true },
    ),
    investor: new FormControl('', { nonNullable: true }),
    province: new FormControl('', { nonNullable: true }),
    projectType: new FormControl('', { nonNullable: true }),
    unitCount: new FormControl<number | null>(null, {
      validators: [Validators.min(0)],
    }),
    floorAreaM2: new FormControl<number | null>(null, {
      validators: [Validators.min(0)],
    }),
    startDate: new FormControl('', { nonNullable: true }),
    dueDate: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    this.loadRequests
      .pipe(
        tap(() => this.state.set({ kind: 'loading' })),
        switchMap((page) =>
          this.projects
            .list({
              page,
              limit: 20,
              ...(this.searchFilter.value.trim()
                ? { search: this.searchFilter.value.trim() }
                : {}),
              ...(this.operationalStatusFilter.value
                ? { operationalStatus: this.operationalStatusFilter.value }
                : {}),
              ...(this.dataQualityFilter.value
                ? { dataQuality: this.dataQualityFilter.value }
                : {}),
            })
            .pipe(
              map((value) => ({ kind: 'ready', value }) as ProjectsState),
              catchError(() => of({ kind: 'error' } as ProjectsState)),
            ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.state.set(state));

    this.searchFilter.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.applyFilters());
    this.operationalStatusFilter.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.applyFilters());
    this.dataQualityFilter.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.applyFilters());
    this.load();
  }

  protected load(page = this.currentPage()): void {
    this.currentPage.set(page);
    this.loadRequests.next(page);
  }

  protected applyFilters(): void {
    this.load(1);
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
        operationalStatus: value.operationalStatus,
        ...(value.investor ? { investor: value.investor } : {}),
        ...(value.province ? { province: value.province } : {}),
        ...(value.projectType ? { projectType: value.projectType } : {}),
        ...(value.unitCount !== null ? { unitCount: value.unitCount } : {}),
        ...(value.floorAreaM2 !== null
          ? { floorAreaM2: value.floorAreaM2 }
          : {}),
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

  protected operationalStatusLabel(
    status: ProjectOperationalStatus | undefined,
  ): string {
    return OPERATIONAL_STATUS_LABELS[status ?? 'not_started'];
  }

  protected formatNumber(value: number | undefined): string {
    return value === undefined
      ? '—'
      : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(
          value,
        );
  }

  protected formatMoney(value: number | undefined): string {
    if (value === undefined || value <= 0) return '—';
    return `${new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 1_000_000_000)} tỷ`;
  }
}
