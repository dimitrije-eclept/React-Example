import type { AccountNumber } from '@features/accounts';
import type { Brand, Money } from '@shared/domain';

/** The only identifier the bank exposes is the masked card number, e.g. "4111********1111". */
export type CardId = Brand<string, 'CardId'>;

export type CardKind = 'debit' | 'credit';

export type CardNetwork = 'visa' | 'mastercard' | 'other';

export type Card = {
  readonly id: CardId;
  readonly kind: CardKind;
  readonly network: CardNetwork;
  readonly lastFour: string;
  readonly expires: { readonly month: number; readonly year: number };
  readonly linkedAccount: AccountNumber;
  /** Blocked cards can't pay or withdraw; the customer can unblock them. */
  readonly blocked: boolean;
  /** Credit cards only. */
  readonly creditLimit: Money | null;
};

/** Card networks by the first digit(s) of the card number (IIN ranges). */
export function networkOf(cardNumber: string): CardNetwork {
  if (cardNumber.startsWith('4')) return 'visa';
  const prefix2 = Number(cardNumber.slice(0, 2));
  const prefix4 = Number(cardNumber.slice(0, 4));
  if ((prefix2 >= 51 && prefix2 <= 55) || (prefix4 >= 2221 && prefix4 <= 2720)) {
    return 'mastercard';
  }
  return 'other';
}
