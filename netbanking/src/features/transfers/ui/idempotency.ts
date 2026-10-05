import { useCallback, useRef } from 'react';
import type { TransferError } from '../domain/transfer';

/** Errors after which we can't tell whether the bank booked the transfer. */
export function isOutcomeUnknown(error: TransferError): boolean {
  return error.kind === 'unavailable' || error.kind === 'unknown';
}

/**
 * One idempotency key per intended transfer. A retry of the *same* request after an unknown outcome
 * reuses the key, so the bank can't book it twice (MESS-43). Anything else gets a fresh key:
 * the bank replays the first answer for a reused key even when the body differs, so reusing a key
 * after e.g. "not enough money" would repeat that answer forever.
 */
export function useIdempotencyKey() {
  const pending = useRef<{ readonly fingerprint: string; readonly key: string } | null>(null);

  const keyFor = useCallback((fingerprint: string) => {
    if (pending.current?.fingerprint !== fingerprint) {
      pending.current = { fingerprint, key: crypto.randomUUID() };
    }
    return pending.current.key;
  }, []);

  /** Call when the bank gave a definite answer (success or a business error). */
  const settle = useCallback(() => {
    pending.current = null;
  }, []);

  return { keyFor, settle };
}
