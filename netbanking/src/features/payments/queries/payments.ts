import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGateway } from '@app/gateway-context';
import { accountKeys } from '@features/accounts';
import { transactionKeys } from '@features/transactions';
import type { PaymentsPort } from '../ports/payments.port';

/** The payment flow is driven by the payment machine, not cached queries. */
export function usePaymentsPort(): PaymentsPort {
  return useGateway().payments;
}

/** Authorising reserves funds and adds a pending transaction; executing books them. */
export function useRefreshBalances(): () => void {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
  }, [queryClient]);
}
