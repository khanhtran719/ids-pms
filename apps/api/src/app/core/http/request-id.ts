import { randomUUID } from 'node:crypto';

const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export function createRequestId(candidate?: string): string {
  if (candidate && SAFE_REQUEST_ID_PATTERN.test(candidate)) {
    return candidate;
  }

  return randomUUID();
}
