import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import type { PermissionCode } from '@project-ql/api-contracts';
import { map } from 'rxjs';
import { AuthSessionService } from './auth-session.service';
import { AuthSessionStore } from './auth-session.store';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);
  return auth.initialize().pipe(
    map((authenticated) =>
      authenticated
        ? true
        : router.createUrlTree(['/login'], {
            queryParams: { returnUrl: state.url },
          }),
    ),
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);
  return auth
    .initialize()
    .pipe(
      map((authenticated) =>
        authenticated ? router.createUrlTree(['/dashboard']) : true,
      ),
    );
};

export function permissionGuard(permission: PermissionCode): CanActivateFn {
  return () => {
    const auth = inject(AuthSessionService);
    const store = inject(AuthSessionStore);
    const router = inject(Router);
    return auth.initialize().pipe(
      map((authenticated) => {
        if (!authenticated) return router.createUrlTree(['/login']);
        return store.hasPermission(permission)
          ? true
          : router.createUrlTree(['/unauthorized']);
      }),
    );
  };
}
