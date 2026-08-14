import { CurrencyPipe, PercentPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { DashboardResponse } from '@project-ql/api-contracts';
import { catchError, map, of, Subject, switchMap, tap } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { DashboardService } from '../../core/dashboard.service';
import {
  SystemHealth,
  SystemHealthService,
} from '../../core/system-health.service';
import { DashboardAnalysisComponent } from './dashboard-analysis.component';
import { DashboardRankingsComponent } from './dashboard-rankings.component';

type DashboardState =
  | { kind: 'loading' }
  | { kind: 'ready'; value: DashboardResponse }
  | { kind: 'error' };

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ready'; value: SystemHealth }
  | { kind: 'error' };

@Component({
  selector: 'app-dashboard-page',
  imports: [
    CurrencyPipe,
    PercentPipe,
    ReactiveFormsModule,
    RouterLink,
    DashboardAnalysisComponent,
    DashboardRankingsComponent,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  private readonly dashboard = inject(DashboardService);
  private readonly health = inject(SystemHealthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dashboardRequests = new Subject<number>();
  protected readonly auth = inject(AuthSessionStore);
  protected readonly dashboardState = signal<DashboardState>({
    kind: 'loading',
  });
  protected readonly healthState = signal<HealthState>({ kind: 'loading' });
  protected readonly fiscalYearControl = new FormControl(2025, {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.min(2000),
      Validators.max(2100),
    ],
  });
  constructor() {
    this.dashboardRequests
      .pipe(
        tap(() => this.dashboardState.set({ kind: 'loading' })),
        switchMap((fiscalYear) =>
          this.dashboard.getSnapshot(fiscalYear).pipe(
            map((value): DashboardState => ({ kind: 'ready', value })),
            catchError(() => of<DashboardState>({ kind: 'error' })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.dashboardState.set(state));
    this.fiscalYearControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadDashboard());
    this.loadDashboard();
    this.loadHealth();
  }

  protected loadDashboard(): void {
    if (this.fiscalYearControl.invalid) return;
    this.dashboardRequests.next(this.fiscalYearControl.value);
  }

  protected loadHealth(): void {
    this.healthState.set({ kind: 'loading' });
    this.health
      .getStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => this.healthState.set({ kind: 'ready', value }),
        error: () => this.healthState.set({ kind: 'error' }),
      });
  }
}
