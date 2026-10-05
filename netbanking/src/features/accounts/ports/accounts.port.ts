import type { PortResult } from '@shared/domain';
import type { Account } from '../domain/account';

export interface AccountsPort {
  /** Every account of the customer, each with its current balance. */
  listAccounts(): PortResult<readonly Account[]>;
}
