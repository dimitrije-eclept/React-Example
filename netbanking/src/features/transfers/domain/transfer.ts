import type { AccountNumber } from '@features/accounts';
import type { DomainError, Money } from '@shared/domain';

export type TransferRequest = {
  readonly from: AccountNumber;
  readonly to: AccountNumber;
  /** Positive, in the currency of both accounts. */
  readonly amount: Money;
  readonly description?: string;
  /**
   * Same key = same transfer: the bank books it at most once and answers a repeat with the first
   * outcome. Reuse it only to retry a request whose outcome is unknown.
   */
  readonly idempotencyKey: string;
};

export type TransferReceipt = {
  readonly reference: string;
  readonly executedAt: Date;
};

/** Request fields a validation error can point at (`validation.fields` keys). */
export type TransferField = 'from' | 'to' | 'amount' | 'description';

/** A transfer can't cross currencies (no FX between own accounts). */
export type TransferError = DomainError | { readonly kind: 'currency_mismatch' };

/** Max length of the free-text description. */
export const TRANSFER_DESCRIPTION_MAX = 140;
