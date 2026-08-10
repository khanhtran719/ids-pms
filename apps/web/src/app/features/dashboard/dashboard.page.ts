import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthSessionStore } from '../../core/auth-session.store';
import {
  SystemHealth,
  SystemHealthService,
} from '../../core/system-health.service';

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ready'; value: SystemHealth }
  | { kind: 'error' };

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  private readonly health = inject(SystemHealthService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthSessionStore);
  protected readonly healthState = signal<HealthState>({ kind: 'loading' });

  constructor() {
    this.loadHealth();
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
