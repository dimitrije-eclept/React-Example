import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthTokens } from '@features/auth';
import { useGateway } from './gateway-context';
import type { Session, SessionState } from './session';

/** PSD2 RTS: at most 5 minutes of inactivity. */
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

type SessionContextValue = {
  readonly state: SessionState;
  readonly signIn: (tokens: AuthTokens) => void;
  readonly signOut: () => void;
  /** Leaves the "you've been signed out" screen. */
  readonly acknowledgeEnd: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/** Ends the session after `timeoutMs` without input, also when the tab slept in between. */
function useIdleTimeout(enabled: boolean, timeoutMs: number, onIdle: () => void) {
  useEffect(() => {
    if (!enabled) return;
    let lastActivity = Date.now();
    const markActive = () => {
      lastActivity = Date.now();
    };
    const check = () => {
      if (Date.now() - lastActivity >= timeoutMs) onIdle();
    };
    ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, markActive, { passive: true }));
    document.addEventListener('visibilitychange', check);
    const interval = window.setInterval(check, Math.min(10_000, timeoutMs));
    return () => {
      ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, markActive));
      document.removeEventListener('visibilitychange', check);
      window.clearInterval(interval);
    };
  }, [enabled, timeoutMs, onIdle]);
}

type SessionProviderProps = {
  readonly session: Session;
  readonly idleTimeoutMs?: number;
  readonly children: ReactNode;
};

export function SessionProvider({
  session,
  idleTimeoutMs = IDLE_TIMEOUT_MS,
  children,
}: SessionProviderProps) {
  const gateway = useGateway();
  const queryClient = useQueryClient();
  const state = useSyncExternalStore(session.subscribe, session.getState);

  // Nothing from a previous session may stay in memory (ADR: cache cleared on logout/timeout).
  useEffect(() => {
    if (state.status !== 'active') queryClient.clear();
  }, [state.status, queryClient]);

  // The logout request reads the token synchronously, so the local session can be dropped right
  // away; the bank-side logout is best effort and nobody waits for it.
  const signOut = useCallback(() => {
    void gateway.auth.signOut();
    session.clear();
  }, [gateway, session]);

  const onIdle = useCallback(() => {
    void gateway.auth.signOut();
    session.end('idle');
  }, [gateway, session]);

  useIdleTimeout(state.status === 'active', idleTimeoutMs, onIdle);

  const value = useMemo<SessionContextValue>(
    () => ({ state, signIn: session.start, signOut, acknowledgeEnd: session.clear }),
    [state, session, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with its provider
export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (value === null) throw new Error('useSession() must be used inside <SessionProvider>.');
  return value;
}
