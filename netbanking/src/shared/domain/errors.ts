/** Closed set of errors every port may return. Handle exhaustively with `assertNever`. */
export type DomainError =
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'sca_required'; readonly challengeId: string }
  | { readonly kind: 'insufficient_funds' }
  | { readonly kind: 'validation'; readonly fields: Readonly<Record<string, string>> }
  | { readonly kind: 'not_found'; readonly resource: string }
  | { readonly kind: 'unavailable'; readonly retryAfterMs?: number }
  | { readonly kind: 'unknown'; readonly cause?: unknown };

export type DomainErrorKind = DomainError['kind'];

export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}

const DOMAIN_ERROR_KINDS: readonly DomainErrorKind[] = [
  'unauthenticated',
  'sca_required',
  'insufficient_funds',
  'validation',
  'not_found',
  'unavailable',
  'unknown',
];

/** Narrows `unknown` (e.g. a query error) to a DomainError. */
export function isDomainError(value: unknown): value is DomainError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    DOMAIN_ERROR_KINDS.some((kind) => kind === value.kind)
  );
}
