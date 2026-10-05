import type { DomainError } from '@shared/domain';

/** The parts of an HTTP response the error mapping needs (structurally `HttpResponse`). */
export type ResponseMeta = {
  readonly status: number;
  readonly headers: Headers;
};

function retryAfterMs(headers: Headers): number | undefined {
  const value = headers.get('Retry-After');
  if (value === null) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}

/**
 * Failures that look the same on every endpoint: empty-body 401 (MESS-10), HTML 5xx and chaos 503
 * with `Retry-After` (MESS-11, MESS-13). Endpoint-specific errors are mapped by each adapter first.
 */
export function toDomainError(response: ResponseMeta): DomainError {
  if (response.status === 401) return { kind: 'unauthenticated' };
  if (response.status === 503 || response.status === 502 || response.status === 504) {
    return { kind: 'unavailable', retryAfterMs: retryAfterMs(response.headers) };
  }
  return { kind: 'unknown', cause: `HTTP ${response.status}` };
}

/** The request never reached the bank. */
export function networkError(): DomainError {
  return { kind: 'unavailable' };
}
