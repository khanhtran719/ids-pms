import { CurrencyPipe, PercentPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
  ListRevenueRequest,
  ProjectDetail,
  RevenueProjectSummary,
  RevenueQuarterSummary,
  RevenueReportResponse,
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
import { RevenueService } from '../../core/revenue.service';
import {
  RevenueActualEditorComponent,
  type RevenueEditorValue,
} from './revenue-actual-editor.component';
import { RevenueQuarterAnalysisComponent } from './revenue-quarter-analysis.component';
import { RevenueProjectTableComponent } from './revenue-project-table.component';

type RevenueState =
  | { kind: 'loading' }
  | { kind: 'ready'; value: RevenueReportResponse }
  | { kind: 'error' };

@Component({
  selector: 'app-revenue-page',
  imports: [
    CurrencyPipe,
    PercentPipe,
    ReactiveFormsModule,
    RevenueActualEditorComponent,
    RevenueQuarterAnalysisComponent,
    RevenueProjectTableComponent,
  ],
  templateUrl: './revenue.page.html',
  styleUrl: './revenue.page.scss',
})
export class RevenuePage {
  private readonly revenue = inject(RevenueService);
  private readonly projects = inject(ProjectsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<ListRevenueRequest>();
  protected readonly auth = inject(AuthSessionStore);
  protected readonly state = signal<RevenueState>({ kind: 'loading' });
  protected readonly page = signal(1);
  protected readonly editor = signal<RevenueEditorValue | null>(null);
  protected readonly saving = signal(false);
  protected readonly operationError = signal<string | null>(null);
  protected readonly projectChoices = signal<ProjectDetail[]>([]);
  protected readonly fiscalYearControl = new FormControl(2025, {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.min(2000),
      Validators.max(2100),
    ],
  });
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  constructor() {
    this.requests
      .pipe(
        tap(() => this.state.set({ kind: 'loading' })),
        switchMap((request) =>
          this.revenue.list(request).pipe(
            map((value): RevenueState => ({ kind: 'ready', value })),
            catchError(() => of<RevenueState>({ kind: 'error' })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.state.set(state));
    this.fiscalYearControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
    this.load();
  }

  protected load(): void {
    if (this.fiscalYearControl.invalid) return;
    const search = this.searchControl.value.trim();
    this.requests.next({
      fiscalYear: this.fiscalYearControl.value,
      page: this.page(),
      limit: 20,
      ...(search ? { search } : {}),
    });
  }

  protected openCreate(): void {
    this.editor.set({ projectId: '', quarter: 1, revenue: 0, cost: 0 });
    this.operationError.set(null);
    this.loadProjectChoices();
  }

  private loadProjectChoices(): void {
    if (this.projectChoices().length > 0) return;
    this.projects
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.projectChoices.set(response.data),
        error: () => this.operationError.set('Không thể tải danh mục dự án.'),
      });
  }

  protected openQuarter(
    project: RevenueProjectSummary,
    quarter: RevenueQuarterSummary,
  ): void {
    this.operationError.set(null);
    this.editor.set({
      projectId: project.projectId,
      quarter: quarter.quarter,
      revenue: quarter.revenue,
      cost: quarter.cost,
    });
    this.loadProjectChoices();
  }

  protected closeEditor(): void {
    this.editor.set(null);
    this.operationError.set(null);
  }

  protected save(value: RevenueEditorValue): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.operationError.set(null);
    this.revenue
      .upsert({
        ...value,
        fiscalYear: this.fiscalYearControl.value,
      })
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.closeEditor();
          this.load();
        },
        error: () =>
          this.operationError.set('Không thể lưu số liệu. Vui lòng thử lại.'),
      });
  }

  protected previous(): void {
    if (this.page() <= 1) return;
    this.page.update((value) => value - 1);
    this.load();
  }

  protected next(): void {
    const current = this.state();
    if (current.kind !== 'ready' || !current.value.meta.hasNextPage) return;
    this.page.update((value) => value + 1);
    this.load();
  }
}
