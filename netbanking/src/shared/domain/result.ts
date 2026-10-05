import type { Result } from 'neverthrow';
import type { DomainError } from './errors';

export { Result, ok, err } from 'neverthrow';

/** What every port method returns. Ports never throw. */
export type PortResult<T> = Promise<Result<T, DomainError>>;

/**
 * For TanStack Query: a query function must throw to signal failure, so the DomainError itself is
 * thrown (and typed as the query error, see app/query-client.ts).
 */
export async function orThrow<T>(result: PortResult<T>): Promise<T> {
  const settled = await result;
  if (settled.isErr()) throw settled.error;
  return settled.value;
}
