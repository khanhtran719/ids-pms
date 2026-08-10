import { computed, Injectable, signal } from '@angular/core';
import type {
  AuthSessionResponse,
  PermissionCode,
} from '@project-ql/api-contracts';

@Injectable({ providedIn: 'root' })
export class AuthSessionStore {
  private readonly session = signal<AuthSessionResponse | null>(null);

  readonly accessToken = computed(() => this.session()?.accessToken ?? null);
  readonly user = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  setSession(session: AuthSessionResponse): void {
    this.session.set(session);
  }

  clear(): void {
    this.session.set(null);
  }

  hasPermission(permission: PermissionCode): boolean {
    return this.user()?.permissions.includes(permission) ?? false;
  }
}
