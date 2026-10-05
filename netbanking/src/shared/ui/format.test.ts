import { describe, expect, it } from 'vitest';
import { formatAmount, formatMoney, intlLocale } from './format';

describe('formatAmount', () => {
  it.each([
    [18_500_000n, '185.000,00'],
    [420_000n, '4.200,00'],
    [5n, '0,05'],
    [-123_456_789n, '-1.234.567,89'],
    // Beyond Number.MAX_SAFE_INTEGER: stays exact because it is formatted from a string.
    [123_456_789_012_345_678n, '1.234.567.890.123.456,78'],
  ])('%s → %s', (minor, text) => {
    expect(formatAmount({ minor, currency: 'RSD' })).toBe(text);
  });

  it('adds the currency code', () => {
    expect(formatMoney({ minor: 420_000n, currency: 'EUR' })).toBe('4.200,00 EUR');
  });
});

describe('intlLocale', () => {
  it('keeps Serbian in Latin script', () => {
    expect(intlLocale('sr')).toBe('sr-Latn-RS');
    expect(intlLocale('en')).toBe('en-GB');
  });
});
