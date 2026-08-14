import { CurrencyPipe, PercentPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type {
  ListPaybackRequest,
  PaybackReportResponse,
  PaybackStatus,
} from '@project-ql/api-contracts';
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
import { PaybackService } from '../../core/payback.service';

type PaybackState =
  | { kind: 'loading' }
  | { kind: 'ready'; value: PaybackReportResponse }
  | { kind: 'error' };

@Component({
  selector: 'app-payback-page',
  imports: [CurrencyPipe, PercentPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './payback.page.html',
  styleUrl: './payback.page.scss',
})
export class PaybackPage {
  private readonly payback = inject(PaybackService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<ListPaybackRequest>();
  protected readonly state = signal<PaybackState>({ kind: 'loading' });
  protected readonly page = signal(1);
  protected readonly fiscalYearControl = new FormControl(2025, {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.min(2000),
      Validators.max(2100),
    ],
  });
  protected readonly statusControl = new FormControl<PaybackStatus | ''>('', {
    nonNullable: true,
  });
  protected readonly searchControl = new FormControl('', { nonNullable: true });

  constructor() {
    this.requests
      .pipe(
        tap(() => this.state.set({ kind: 'loading' })),
        switchMap((request) =>
          this.payback.getReport(request).pipe(
            map((value): PaybackState => ({ kind: 'ready', value })),
            catchError(() => of<PaybackState>({ kind: 'error' })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.state.set(state));
    this.fiscalYearControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetAndLoad());
    this.statusControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetAndLoad());
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.resetAndLoad());
    this.load();
  }

  protected load(): void {
    if (this.fiscalYearControl.invalid) return;
    const search = this.searchControl.value.trim();
    const status = this.statusControl.value;
    this.requests.next({
      fiscalYear: this.fiscalYearControl.value,
      page: this.page(),
      limit: 20,
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
    });
  }

  protected clearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.statusControl.setValue('', { emitEvent: false });
    this.resetAndLoad();
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

  protected meterWidth(ratio: number): number {
    return Math.min(ratio * 100, 100);
  }

  private resetAndLoad(): void {
    this.page.set(1);
    this.load();
  }
}
