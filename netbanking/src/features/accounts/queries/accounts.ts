import { useQuery } from '@tanstack/react-query';
import { useGateway } from '@app/gateway-context';
import { orThrow } from '@shared/domain';

export const accountKeys = {
  all: ['accounts'] as const,
};

/** Accounts with balances. Balances move, so they count as fresh for 30 s only. */
export function useAccounts() {
  const { accounts } = useGateway();
  return useQuery({
    queryKey: accountKeys.all,
    queryFn: () => orThrow(accounts.listAccounts()),
    staleTime: 30_000,
  });
}
