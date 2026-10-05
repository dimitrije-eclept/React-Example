import type { AuthTokens } from '@features/auth';
import type { DomainError, Result } from '@shared/domain';

/** Why a session ended without the customer signing out. */
export type SessionEndReason = 'idle' | 'expired';

export type SessionState =
  | { readonly status: 'signed-out' }
  | { readonly status: 'active' }
  | { readonly status: 'ended'; readonly reason: SessionEndReason };

export type Session = {
  readonly getState: () => SessionState;
  readonly subscribe: (listener: () => void) => () => void;
  readonly getAccessToken: () => string | null;
  readonly start: (tokens: AuthTokens) => void;
  /** Rotates the tokens once, however many requests ask at the same time. */
  readonly refresh: () => Promise<boolean>;
  /** Drops the tokens and tells the customer why. */
  readonly end: (reason: SessionEndReason) => void;
  /** Drops the tokens quietly (the customer signed out, or acknowledged an ended session). */
  readonly clear: () => void;
};

type Renew = (refreshToken: string) => Promise<Result<AuthTokens, DomainError>>;

/**
 * Tokens live in this closure only: never in Web Storage, gone on reload (ADR security baseline).
 * `renew` is late-bound because the auth adapter needs the HTTP client, which needs this session.
 */
export function createSession(renew: Renew): Session {
  let tokens: AuthTokens | null = null;
  let state: SessionState = { status: 'signed-out' };
  let refreshing: Promise<boolean> | null = null;
  // Bumped on every start/end, so a refresh that resolves late can't revive an old session.
  let generation = 0;
  const listeners = new Set<() => void>();

  const setState = (next: SessionState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const drop = (next: SessionState) => {
    tokens = null;
    refreshing = null;
    generation += 1;
    setState(next);
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getAccessToken: () => tokens?.accessToken ?? null,
    start(next) {
      tokens = next;
      generation += 1;
      setState({ status: 'active' });
    },
    refresh() {
      if (tokens === null) return Promise.resolve(false);
      if (refreshing) return refreshing;
      const startedIn = generation;
      refreshing = renew(tokens.refreshToken).then((result) => {
        if (startedIn !== generation) return false;
        refreshing = null;
        if (result.isErr()) return false;
        tokens = result.value;
        return true;
      });
      return refreshing;
    },
    end(reason) {
      if (state.status === 'active') drop({ status: 'ended', reason });
    },
    clear() {
      drop({ status: 'signed-out' });
    },
  };
}
