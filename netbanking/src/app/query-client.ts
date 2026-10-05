import { QueryClient } from '@tanstack/react-query';
import type { DomainError } from '@shared/domain';
import { isDomainError } from '@shared/domain';

// Query functions throw the port's DomainError (see `orThrow`), so that is the error type.
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: DomainError;
  }
}

const MAX_RETRIES = 2;
const MAX_RETRY_DELAY_MS = 5_000;

/**
 * Only an outage is worth retrying (MESS-13: chaos 503 with Retry-After). Everything else, and a
 * 401 in particular, fails straight away: retrying can't fix it.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          failureCount < MAX_RETRIES && isDomainError(error) && error.kind === 'unavailable',
        retryDelay: (attempt, error) =>
          Math.min(
            isDomainError(error) && error.kind === 'unavailable' && error.retryAfterMs
              ? error.retryAfterMs
              : 1_000 * 2 ** attempt,
            MAX_RETRY_DELAY_MS,
          ),
      },
      mutations: { retry: false },
    },
  });
}
