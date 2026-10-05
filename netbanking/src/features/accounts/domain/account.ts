import type { Brand, Currency, Iban, Money } from '@shared/domain';

/** Domestic account number as customers know it, e.g. "160-0000000123456-78". */
export type AccountNumber = Brand<string, 'AccountNumber'>;

export type AccountKind = 'current' | 'savings' | 'card';

export type Balance = {
  /** What can be spent now. */
  readonly available: Money;
  /** What has settled. Higher than `available` while debits are pending. */
  readonly booked: Money;
};

export type Account = {
  readonly number: AccountNumber;
  readonly iban: Iban;
  /** The customer's or bank's name for the account; `null` when there is none. */
  readonly name: string | null;
  readonly kind: AccountKind;
  readonly currency: Currency;
  readonly blocked: boolean;
  /** ISO date, e.g. "2019-03-14". */
  readonly openedOn: string;
  readonly balance: Balance;
};

/** Reserved by pending debits (card purchases, signed payments); `null` when nothing is pending. */
export function pendingAmount({ available, booked }: Balance): Money | null {
  const minor = booked.minor - available.minor;
  return minor > 0n ? { minor, currency: booked.currency } : null;
}
