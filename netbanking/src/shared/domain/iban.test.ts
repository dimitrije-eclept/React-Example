import { describe, expect, it } from 'vitest';
import { formatIban, parseIban } from './iban';

describe('parseIban', () => {
  it.each([
    'RS35105008123123123173',
    'RS35 1050 0812 3123 1231 73',
    ' rs35105008123123123173 ',
    'RS81999000000000000099',
    'DE89370400440532013000',
  ])('accepts %j', (text) => {
    expect(parseIban(text)).toBe(text.replace(/\s/g, '').toUpperCase());
  });

  it.each([
    'RS36105008123123123173', // wrong check digits
    'RS35999000000000000099', // the spec's example fails mod-97 (MESS-53)
    'RS3510500812312312317', // Serbian IBANs are 22 characters
    '160-0000000123456-78',
    '',
  ])('rejects %j', (text) => {
    expect(parseIban(text)).toBeNull();
  });
});

describe('formatIban', () => {
  it('groups by four', () => {
    expect(formatIban('RS35105008123123123173')).toBe('RS35 1050 0812 3123 1231 73');
  });
});
