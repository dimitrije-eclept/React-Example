import { describe, expect, it, vi } from 'vitest';
import { err, ok, type DomainError, type Result } from '@shared/domain';
import type { AuthTokens } from '@features/auth';
import { createSession } from './session';

const tokens = (n: number): AuthTokens => ({
  accessToken: `a${n}`,
  refreshToken: `r${n}`,
  expiresInMs: 300_000,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('session', () => {
  it('holds the access token only while active', () => {
    const session = createSession(vi.fn());
    expect(session.getAccessToken()).toBeNull();
    session.start(tokens(1));
    expect(session.getState()).toEqual({ status: 'active' });
    expect(session.getAccessToken()).toBe('a1');
    session.end('idle');
    expect(session.getState()).toEqual({ status: 'ended', reason: 'idle' });
    expect(session.getAccessToken()).toBeNull();
  });

  it('refreshes once for concurrent callers and rotates the tokens', async () => {
    const pending = deferred<Result<AuthTokens, DomainError>>();
    const renew = vi.fn(() => pending.promise);
    const session = createSession(renew);
    session.start(tokens(1));

    const both = Promise.all([session.refresh(), session.refresh()]);
    pending.resolve(ok(tokens(2)));

    expect(await both).toEqual([true, true]);
    expect(renew).toHaveBeenCalledOnce();
    expect(renew).toHaveBeenCalledWith('r1');
    expect(session.getAccessToken()).toBe('a2');
  });

  it('reports a failed refresh', async () => {
    const session = createSession(async () => err({ kind: 'unauthenticated' }));
    session.start(tokens(1));
    expect(await session.refresh()).toBe(false);
  });

  it('ignores a refresh that finishes after the session ended', async () => {
    const pending = deferred<Result<AuthTokens, DomainError>>();
    const session = createSession(() => pending.promise);
    session.start(tokens(1));

    const refreshed = session.refresh();
    session.clear();
    pending.resolve(ok(tokens(2)));

    expect(await refreshed).toBe(false);
    expect(session.getAccessToken()).toBeNull();
  });

  it('only ends an active session, so a late 401 cannot override a sign-out', () => {
    const session = createSession(vi.fn());
    session.start(tokens(1));
    session.clear();
    session.end('expired');
    expect(session.getState()).toEqual({ status: 'signed-out' });
  });
});
