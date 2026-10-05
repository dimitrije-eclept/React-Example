import type { Http } from '@shared/api';
import { networkError, parsePayload, toDomainError, toValidationError } from '@shared/adapters';
import { err } from '@shared/domain';
import type { TransactionsPort } from '../../ports/transactions.port';
import { DC, toDottedDate, toTransactionPage } from './mappers';
import { txnPageSchema } from './schemas';

export function createLegacyBankTransactions(http: Http): TransactionsPort {
  return {
    async listTransactions({ account, from, to, direction, page }) {
      const sent = await http.send({
        method: 'GET',
        // MESS-30: v1, while accounts are v2.
        path: '/core/v1/txn/history',
        query: {
          acc: account,
          dateFrom: from && toDottedDate(from),
          dateTo: to && toDottedDate(to),
          dc: direction && DC[direction],
          // MESS-32: 1-based, fixed size 20.
          page,
        },
      });
      if (sent.isErr()) return err(networkError());
      const response = sent.value;
      if (response.status === 404) return err({ kind: 'not_found', resource: 'account' });
      if (response.status === 422) return err(toValidationError(response.body));
      if (response.status !== 200) return err(toDomainError(response));
      return parsePayload(txnPageSchema, response.body, 'GET /core/v1/txn/history').andThen(
        toTransactionPage,
      );
    },
  };
}
