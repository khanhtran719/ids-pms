import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, OnDestroy } from '@angular/core';
import type { AuthSessionResponse } from '@project-ql/api-contracts';
import { catchError, map, Observable, of, shareReplay, tap } from 'rxjs';
import { AuthSessionStore } from './auth-session.store';

export interface LoginCommand {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthSessionStore);
  private initialized = false;
  private initializationRequest?: Observable<boolean>;
  private refreshTimer?: ReturnType<typeof setTimeout>;
  private accessTokenExpiresAt = 0;

  initialize(): Observable<boolean> {
    if (this.store.isAuthenticated()) return of(true);
    if (this.initialized) return of(false);
    if (this.initializationRequest) return this.initializationRequest;

    this.initializationRequest = this.http
      .post<AuthSessionResponse>('/api/v1/auth/refresh', {})
      .pipe(
        tap((session) => this.applySession(session)),
        map(() => true),
        catchError(() => {
          this.store.clear();
          return of(false);
        }),
        tap(() => (this.initialized = true)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.initializationRequest;
  }

  login(command: LoginCommand): Observable<AuthSessionResponse> {
    return this.http
      .post<AuthSessionResponse>('/api/v1/auth/login', command)
      .pipe(
        tap((session) => {
          this.applySession(session);
          this.initialized = true;
        }),
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/v1/auth/logout', {}).pipe(
      catchError(() => of(undefined)),
      tap(() => {
        this.cancelScheduledRefresh();
        this.store.clear();
        this.initialized = true;
      }),
    );
  }

  ngOnDestroy(): void {
    this.cancelScheduledRefresh();
  }

  private applySession(session: AuthSessionResponse): void {
    this.store.setSession(session);
    this.accessTokenExpiresAt = Date.now() + session.expiresInSeconds * 1_000;
    this.scheduleRefresh(
      Math.max(10_000, (session.expiresInSeconds - 60) * 1_000),
    );
  }

  private scheduleRefresh(delayMilliseconds: number): void {
    this.cancelScheduledRefresh();
    this.refreshTimer = globalThis.setTimeout(
      () => this.refreshAccessToken(),
      delayMilliseconds,
    );
  }

  private refreshAccessToken(): void {
    this.refreshTimer = undefined;
    this.http.post<AuthSessionResponse>('/api/v1/auth/refresh', {}).subscribe({
      next: (session) => this.applySession(session),
      error: (error: unknown) => {
        if (
          error instanceof HttpErrorResponse &&
          [401, 403].includes(error.status)
        ) {
          this.store.clear();
          return;
        }

        const remainingMilliseconds = this.accessTokenExpiresAt - Date.now();
        if (remainingMilliseconds > 5_000) {
          this.scheduleRefresh(Math.min(15_000, remainingMilliseconds - 1_000));
        } else {
          this.store.clear();
        }
      },
    });
  }

  private cancelScheduledRefresh(): void {
    if (this.refreshTimer !== undefined) {
      globalThis.clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }
}
