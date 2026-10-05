import type { AccountNumber } from '@features/accounts';
import type { Money } from '@shared/domain';

export type TransactionStatus = 'booked' | 'pending';

export type Transaction = {
  /** The bank's reference, e.g. "TX20260914-000123". */
  readonly reference: string;
  /** Signed: negative when money left the account. */
  readonly amount: Money;
  readonly status: TransactionStatus;
  /** ISO date. Pending items already have one (the day they were made). */
  readonly bookedOn: string;
  /** ISO date the money counts from. */
  readonly valueOn: string;
  readonly counterpartyName: string | null;
  /** Domestic account number or IBAN, when the bank knows it. */
  readonly counterpartyAccount: string | null;
  readonly description: string | null;
};

export type Direction = 'in' | 'out';

export type TransactionFilter = {
  readonly account: AccountNumber;
  /** Inclusive ISO dates; open-ended when missing. */
  readonly from?: string;
  readonly to?: string;
  readonly direction?: Direction;
  /** 1-based. */
  readonly page: number;
};

export type TransactionPage = {
  /** Newest first. */
  readonly items: readonly Transaction[];
  readonly page: number;
  /** 0 when nothing matches. */
  readonly pageCount: number;
};
