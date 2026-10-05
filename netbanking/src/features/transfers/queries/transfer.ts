import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGateway } from '@app/gateway-context';
import { accountKeys } from '@features/accounts';
import { transactionKeys } from '@features/transactions';
import type { TransferError, TransferReceipt, TransferRequest } from '../domain/transfer';

/** Runs a transfer. Afterwards balances and history of both accounts have changed. */
export function useTransfer() {
  const { transfers } = useGateway();
  const queryClient = useQueryClient();
  return useMutation<TransferReceipt, TransferError, TransferRequest>({
    mutationFn: async (request) => {
      const result = await transfers.transfer(request);
      if (result.isErr()) throw result.error;
      return result.value;
    },
    // Also after a failure: an unknown outcome may still have booked the transfer.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: accountKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
      ]),
  });
}
