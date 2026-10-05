import { createHttp } from '@shared/api';
import { ADAPTER_KINDS, createGateway, type AdapterKind, type Gateway } from './gateway';
import { createSession, type Session } from './session';

function parseAdapterKind(value: string): AdapterKind {
  const kind = ADAPTER_KINDS.find((candidate) => candidate === value);
  if (kind === undefined) {
    throw new Error(
      `Unknown VITE_ADAPTER "${value}". Expected one of: ${ADAPTER_KINDS.join(', ')}.`,
    );
  }
  return kind;
}

export type AppContainer = {
  readonly gateway: Gateway;
  readonly session: Session;
};

/**
 * The only place that chooses an adapter set (`VITE_ADAPTER`, default `legacy-bank`) and wires the
 * session's token into the HTTP client.
 */
export function createAppContainer(
  adapter: string = import.meta.env.VITE_ADAPTER || 'legacy-bank',
  baseUrl: string = import.meta.env.VITE_API_URL ?? '',
): AppContainer {
  // Late-bound: the session renews through the auth port, which needs the HTTP client. `gateway`
  // is only read when a refresh happens, long after this function returned.
  const session = createSession((refreshToken) => gateway.auth.refresh(refreshToken));
  const http = createHttp({
    baseUrl,
    auth: {
      getAccessToken: session.getAccessToken,
      refresh: session.refresh,
      onUnauthorized: () => session.end('expired'),
    },
  });
  const gateway: Gateway = createGateway(parseAdapterKind(adapter), { http });
  return { gateway, session };
}
