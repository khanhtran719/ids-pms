import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type {
  DataQualityIssueType,
  DataQualityReportResponse,
  ListDataQualityRequest,
} from '@project-ql/api-contracts';
import { RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { DataQualityService } from '../../core/data-quality.service';

type DataQualityState =
  | { kind: 'loading' }
  | { kind: 'ready'; value: DataQualityReportResponse }
  | { kind: 'error' };

const ISSUE_LABELS: Record<DataQualityIssueType, string> = {
  data_conflict: 'Xung đột nguồn',
  missing_capex: 'Thiếu CAPEX',
  missing_task_plan: 'Thiếu kế hoạch',
  overdue_task: 'Task quá hạn',
  missing_actual_end: 'Thiếu ngày thực tế',
};

@Component({
  selector: 'app-data-quality-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './data-quality.page.html',
  styleUrl: './data-quality.page.scss',
})
export class DataQualityPage {
  private readonly dataQuality = inject(DataQualityService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<ListDataQualityRequest>();
  protected readonly state = signal<DataQualityState>({ kind: 'loading' });
  protected readonly page = signal(1);
  protected readonly searchControl = new FormControl('', {
    nonNullable: true,
  });
  protected readonly issueTypeFilter = new FormControl<
    DataQualityIssueType | ''
  >('', { nonNullable: true });

  constructor() {
    this.requests
      .pipe(
        tap(() => this.state.set({ kind: 'loading' })),
        switchMap((request) =>
          this.dataQuality.getReport(request).pipe(
            map(
              (value): DataQualityState => ({ kind: 'ready', value }),
            ),
            catchError(() => of<DataQualityState>({ kind: 'error' })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.state.set(state));

    this.issueTypeFilter.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
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
    const search = this.searchControl.value.trim();
    const issueType = this.issueTypeFilter.value;
    this.requests.next({
      page: this.page(),
      limit: 20,
      ...(issueType ? { issueType } : {}),
      ...(search ? { search } : {}),
    });
  }

  protected previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((value) => value - 1);
    this.load();
  }

  protected nextPage(): void {
    const current = this.state();
    if (current.kind !== 'ready' || !current.value.meta.hasNextPage) return;
    this.page.update((value) => value + 1);
    this.load();
  }

  protected clearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.issueTypeFilter.setValue('', { emitEvent: false });
    this.page.set(1);
    this.load();
  }

  protected issueLabel(issue: DataQualityIssueType): string {
    return ISSUE_LABELS[issue];
  }
}
