import { HttpInterceptorFn } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { AuthSessionStore } from './auth-session.store';

export const CLIENT_REQUEST_ID_FACTORY = new InjectionToken<() => string>(
  'CLIENT_REQUEST_ID_FACTORY',
  {
    providedIn: 'root',
    factory: () => () => globalThis.crypto.randomUUID(),
  },
);

export const apiRequestContextInterceptor: HttpInterceptorFn = (
  request,
  next,
) => {
  if (!request.url.startsWith('/api/')) {
    return next(request);
  }

  const createRequestId = inject(CLIENT_REQUEST_ID_FACTORY);
  const auth = inject(AuthSessionStore);
  const token = auth.accessToken();
  const isStateChanging = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Request-Id': request.headers.get('X-Request-Id') ?? createRequestId(),
  };
  if (isStateChanging) headers['X-CSRF-Protection'] = '1';
  if (token && !request.headers.has('Authorization')) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return next(
    request.clone({
      withCredentials: true,
      setHeaders: headers,
    }),
  );
};
