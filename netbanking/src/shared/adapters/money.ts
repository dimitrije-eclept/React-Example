import { z } from 'zod';
import {
  CURRENCY_EXPONENT,
  err,
  isCurrency,
  ok,
  type Currency,
  type DomainError,
  type Money,
  type Result,
} from '@shared/domain';

const SR_AMOUNT = /^(-?)(\d{1,3}(?:\.\d{3})*),(\d+)$/;

/**
 * MESS-4: response amounts are sr-RS strings, "185.000,00" ('.' thousands, ',' decimals).
 * Parsed straight into integer minor units; never through a float.
 */
export function parseSrAmount(text: string, currency: Currency): Result<Money, DomainError> {
  const match = SR_AMOUNT.exec(text.trim());
  const exponent = CURRENCY_EXPONENT[currency];
  if (match === null || match[3]!.length !== exponent) {
    return err({ kind: 'unknown', cause: 'malformed_amount' });
  }
  const [, sign, whole, fraction] = match;
  const minor = BigInt(`${whole!.replaceAll('.', '')}${fraction}`);
  return ok({ minor: sign === '-' ? -minor : minor, currency });
}

/** ISO currency code the domain supports; anything else is schema drift. */
export const currencySchema = z.custom<Currency>(
  (value) => typeof value === 'string' && isCurrency(value),
  'unsupported_currency',
);
