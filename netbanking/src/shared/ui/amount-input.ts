import { CURRENCY_EXPONENT, type Currency, type Money } from '@shared/domain';

/**
 * Reads an amount the customer typed. Serbian conventions first ("15.000,50": '.' groups thousands,
 * ',' is the decimal mark), but a lone '.' followed by one or two digits is taken as a decimal
 * mark too ("1500.5"), since that is how people type on English keyboards. Returns `null` for
 * anything else, including more decimals than the currency has.
 */
export function parseAmountInput(text: string, currency: Currency): Money | null {
  const compact = text.replace(/[\s\u00a0]/g, '');
  if (compact === '') return null;
  const exponent = CURRENCY_EXPONENT[currency];

  let whole: string;
  let fraction = '';
  if (compact.includes(',')) {
    const [integerPart, decimalPart, ...rest] = compact.split(',');
    if (rest.length > 0 || !/^\d{1,3}(\.\d{3})*$|^\d+$/.test(integerPart!)) return null;
    whole = integerPart!.replaceAll('.', '');
    fraction = decimalPart!;
  } else if (/^\d+\.\d{1,2}$/.test(compact)) {
    [whole, fraction] = compact.split('.') as [string, string];
  } else if (/^\d{1,3}(\.\d{3})+$|^\d+$/.test(compact)) {
    whole = compact.replaceAll('.', '');
  } else {
    return null;
  }

  if (!/^\d*$/.test(fraction) || fraction.length > exponent || whole === '') return null;
  return { minor: BigInt(whole + fraction.padEnd(exponent, '0')), currency };
}
