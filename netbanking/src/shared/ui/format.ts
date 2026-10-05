import { CURRENCY_EXPONENT, toDecimalString, type Money } from '@shared/domain';

/**
 * Amounts use Serbian number formatting in every UI language ("185.000,00"), as in the design:
 * customers compare them with statements and SMS messages from the bank.
 */
const AMOUNT_LOCALE = 'sr-Latn-RS';

const formatters = new Map<number, Intl.NumberFormat>();

function formatter(digits: number): Intl.NumberFormat {
  let cached = formatters.get(digits);
  if (cached === undefined) {
    cached = new Intl.NumberFormat(AMOUNT_LOCALE, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatters.set(digits, cached);
  }
  return cached;
}

/** "185.000,00". Formats the exact decimal string, so bigint amounts never become floats. */
export function formatAmount(money: Money): string {
  const decimal = toDecimalString(money) as `${number}`;
  return formatter(CURRENCY_EXPONENT[money.currency]).format(decimal);
}

/** "185.000,00 RSD" */
export function formatMoney(money: Money): string {
  return `${formatAmount(money)} ${money.currency}`;
}

/** Intl locale for a UI language. Plain "sr" would format in Cyrillic; the UI is Latin script. */
export function intlLocale(language: string): string {
  return language.startsWith('en') ? 'en-GB' : 'sr-Latn-RS';
}

/** "−499,99" / "+170.214,37": a real minus sign, and an explicit plus for money coming in. */
export function formatSignedAmount(money: Money): string {
  if (money.minor === 0n) return formatAmount(money);
  const sign = money.minor < 0n ? '−' : '+';
  return sign + formatAmount({ ...money, minor: money.minor < 0n ? -money.minor : money.minor });
}
