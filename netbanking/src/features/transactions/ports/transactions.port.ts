import type { PortResult } from '@shared/domain';
import type { TransactionFilter, TransactionPage } from '../domain/transaction';

export interface TransactionsPort {
  /** One page of an account's history, newest first. */
  listTransactions(filter: TransactionFilter): PortResult<TransactionPage>;
}
