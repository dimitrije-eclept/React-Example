import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { useGateway } from '@app/gateway-context';
import { orThrow } from '@shared/domain';
import type { TransactionFilter } from '../domain/transaction';

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filter: TransactionFilter) => [...transactionKeys.all, filter] as const,
};

/**
 * One page of history. The previous page stays on screen while the next one loads. Without a
 * filter (e.g. an inverted date range) nothing is shown: rows from another range would mislead.
 */
export function useTransactions(filter: TransactionFilter | undefined) {
  const { transactions } = useGateway();
  return useQuery({
    queryKey: filter ? transactionKeys.list(filter) : transactionKeys.all,
    queryFn: filter ? () => orThrow(transactions.listTransactions(filter)) : skipToken,
    placeholderData: filter ? keepPreviousData : undefined,
    staleTime: 30_000,
  });
}
