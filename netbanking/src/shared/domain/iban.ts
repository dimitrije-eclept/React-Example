import type { Brand } from './brand';

/** Normalised IBAN: upper case, no spaces, valid check digits. */
export type Iban = Brand<string, 'Iban'>;

const SHAPE = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

/** ISO 13616 mod-97 over the rearranged IBAN, digit by digit (no bigint needed). */
function mod97(rearranged: string): number {
  let remainder = 0;
  for (const char of rearranged) {
    const value = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of value) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder;
}

/** Accepts what people type ("rs35 1050 0812 …"); `null` unless the check digits are right. */
export function parseIban(text: string): Iban | null {
  const compact = text.replace(/\s+/g, '').toUpperCase();
  if (!SHAPE.test(compact)) return null;
  // Serbian IBANs are always 22 characters.
  if (compact.startsWith('RS') && compact.length !== 22) return null;
  return mod97(compact.slice(4) + compact.slice(0, 4)) === 1 ? (compact as Iban) : null;
}

/** "RS35 1050 0812 3123 1231 73" */
export function formatIban(iban: string): string {
  return iban.replace(/(.{4})(?=.)/g, '$1 ');
}
