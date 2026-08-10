import { HttpInterceptorFn } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';

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
  return next(
    request.clone({
      setHeaders: {
        Accept: 'application/json',
        'X-Request-Id':
          request.headers.get('X-Request-Id') ?? createRequestId(),
      },
    }),
  );
};
