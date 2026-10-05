import { createContext, useContext, type ReactNode } from 'react';
import type { Gateway } from './gateway';

// eslint-disable-next-line react-refresh/only-export-components -- context belongs with its provider
export const GatewayContext = createContext<Gateway | null>(null);

type GatewayProviderProps = {
  readonly gateway: Gateway;
  readonly children: ReactNode;
};

export function GatewayProvider({ gateway, children }: GatewayProviderProps) {
  return <GatewayContext.Provider value={gateway}>{children}</GatewayContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with its provider
export function useGateway(): Gateway {
  const gateway = useContext(GatewayContext);
  if (gateway === null) {
    throw new Error(
      'useGateway() must be used inside <GatewayProvider>. Wrap the app in <Providers>.',
    );
  }
  return gateway;
}
