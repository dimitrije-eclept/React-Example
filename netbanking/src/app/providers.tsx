import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { GatewayProvider } from './gateway-context';
import type { Gateway } from './gateway';
import { createQueryClient } from './query-client';
import type { Session } from './session';
import { SessionProvider } from './session-context';

type ProvidersProps = {
  readonly gateway: Gateway;
  readonly session: Session;
  readonly children: ReactNode;
};

/** i18n needs no provider: `initI18n()` registers the instance globally (see main.tsx). */
export function Providers({ gateway, session, children }: ProvidersProps) {
  // One client per mounted app; never persisted (see ADR security baseline).
  const [queryClient] = useState(createQueryClient);

  return (
    <GatewayProvider gateway={gateway}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider session={session}>{children}</SessionProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </GatewayProvider>
  );
}
