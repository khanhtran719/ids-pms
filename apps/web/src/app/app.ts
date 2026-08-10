import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import {
  SystemHealth,
  SystemHealthService,
} from './core/system-health.service';

type HealthViewState =
  | { kind: 'loading' }
  | { kind: 'ready'; health: SystemHealth }
  | { kind: 'error' };

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly destroyRef = inject(DestroyRef);
  private readonly healthService = inject(SystemHealthService);

  protected readonly viewState = signal<HealthViewState>({ kind: 'loading' });
  protected readonly currentHealth = computed(() => {
    const state = this.viewState();
    return state.kind === 'ready' ? state.health : null;
  });

  constructor() {
    this.refreshStatus();
  }

  protected refreshStatus(): void {
    this.viewState.set({ kind: 'loading' });

    this.healthService
      .getStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (health) => this.viewState.set({ kind: 'ready', health }),
        error: () => this.viewState.set({ kind: 'error' }),
      });
  }
}
