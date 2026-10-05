import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createGateway, type Gateway } from '@app/gateway';
import { GatewayProvider } from '@app/gateway-context';
import { createHttp, type Http } from '@shared/api';
import { BANK } from './fixtures/legacy-bank';

/** HTTP client against the MSW bank, with a fixed token and no refresh. */
export function createTestHttp(): Http {
  return createHttp({
    baseUrl: BANK,
    auth: { getAccessToken: () => 'test-token', refresh: async () => false, onUnauthorized() {} },
  });
}

/**
 * Renders a feature component against the legacy-bank adapters and MSW, without retries so error
 * states show at once.
 */
export function renderWithGateway(
  ui: ReactElement,
  gateway: Gateway = createGateway('legacy-bank', { http: createTestHttp() }),
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <GatewayProvider gateway={gateway}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </GatewayProvider>,
  );
}
