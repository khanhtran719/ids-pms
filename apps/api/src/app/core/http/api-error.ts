import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorResponse } from '@project-ql/api-contracts';

export interface ApiErrorContext {
  path: string;
  requestId: string;
  timestamp: string;
}

interface HttpExceptionBody {
  code?: unknown;
  details?: unknown;
  message?: unknown;
}

const DEFAULT_ERROR_CODES: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeApiError(
  exception: unknown,
  context: ApiErrorContext,
): ApiErrorResponse {
  if (!(exception instanceof HttpException)) {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      ...context,
    };
  }

  const statusCode = exception.getStatus();
  const rawResponse = exception.getResponse();
  const body: HttpExceptionBody = isRecord(rawResponse) ? rawResponse : {};

  if (Array.isArray(body.message)) {
    return {
      statusCode,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: { errors: body.message },
      ...context,
    };
  }

  const code =
    typeof body.code === 'string'
      ? body.code
      : (DEFAULT_ERROR_CODES[statusCode] ?? 'HTTP_ERROR');
  const message =
    typeof body.message === 'string'
      ? body.message
      : typeof rawResponse === 'string'
        ? rawResponse
        : exception.message;

  return {
    statusCode,
    code,
    message,
    ...(body.details === undefined ? {} : { details: body.details }),
    ...context,
  };
}
