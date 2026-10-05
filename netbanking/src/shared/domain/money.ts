export type Currency = 'RSD' | 'EUR' | 'USD';

export const CURRENCIES: readonly Currency[] = ['RSD', 'EUR', 'USD'];

/** Amount in integer minor units (e.g. para, cents). Floats are forbidden for money. */
export type Money = {
  readonly minor: bigint;
  readonly currency: Currency;
};

/** Number of minor-unit digits per currency (ISO 4217). */
export const CURRENCY_EXPONENT: Readonly<Record<Currency, number>> = {
  RSD: 2,
  EUR: 2,
  USD: 2,
};

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}

/** Exact decimal string for a Money value, e.g. `{ minor: 18500000n, currency: 'RSD' }` → `"185000.00"`. */
export function toDecimalString({ minor, currency }: Money): string {
  const exponent = CURRENCY_EXPONENT[currency];
  const sign = minor < 0n ? '-' : '';
  const digits = (minor < 0n ? -minor : minor).toString().padStart(exponent + 1, '0');
  if (exponent === 0) return sign + digits;
  return `${sign}${digits.slice(0, -exponent)}.${digits.slice(-exponent)}`;
}
