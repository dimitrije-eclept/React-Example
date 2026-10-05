import type { AccountNumber } from '@features/accounts';
import type { Brand, DomainError, Iban, Money } from '@shared/domain';

export type PaymentId = Brand<string, 'PaymentId'>;

/** What the customer fills in for a domestic (RSD) payment. */
export type PaymentOrder = {
  readonly from: AccountNumber;
  readonly recipientName: string;
  readonly recipientIban: Iban;
  readonly amount: Money;
  /** Three-digit Serbian payment code ("šifra plaćanja"), e.g. "289". */
  readonly purposeCode: string;
  /** "Poziv na broj", e.g. "97 123-456". */
  readonly reference?: string;
  readonly description?: string;
};

export const PAYMENT_LIMITS = { recipientName: 70, reference: 35, description: 140 } as const;

/** The bank created the payment and texted a code that authorises exactly this order. */
export type PaymentChallenge = {
  readonly paymentId: PaymentId;
  readonly maskedPhone: string;
};

export type PaymentState =
  /** Created, waiting for the SMS code. */
  | 'awaiting_authorization'
  /** Authorised; funds reserved; the bank is executing it. */
  | 'processing'
  | 'executed'
  | 'rejected'
  /** Too many wrong codes: nothing was paid. */
  | 'cancelled';

export type PaymentStatus = {
  readonly id: PaymentId;
  readonly state: PaymentState;
  /** When the payment entered this state. */
  readonly changedAt: Date;
};

/** Field-level problems use the order's field names (`recipientIban`, `amount`, …). */
export type PrepareError = DomainError;

export type AuthorizeError =
  | { readonly kind: 'wrong_code'; readonly attemptsLeft: number }
  /** Third wrong code: the payment is cancelled. */
  | { readonly kind: 'locked' }
  /** Detected while authorising: the payment is rejected, nothing is paid. */
  | { readonly kind: 'insufficient_funds' }
  /** It was already authorised (or ended) before; ask for its status. */
  | { readonly kind: 'not_awaiting_authorization' }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'unknown' };

export function isFinal(state: PaymentState): boolean {
  return state === 'executed' || state === 'rejected' || state === 'cancelled';
}
