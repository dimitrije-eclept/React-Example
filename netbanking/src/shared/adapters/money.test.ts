import { describe, expect, it } from 'vitest';
import { parseSrAmount } from './money';

describe('parseSrAmount (MESS-4)', () => {
  it.each([
    ['185.000,00', 18_500_000n],
    ['4.200,00', 420_000n],
    ['0,05', 5n],
    ['999,99', 99_999n],
    ['-1.234.567,89', -123_456_789n],
    ['12.345.678.901.234,56', 1_234_567_890_123_456n],
  ])('%s → %s minor units', (text, minor) => {
    expect(parseSrAmount(text, 'RSD')._unsafeUnwrap()).toEqual({ minor, currency: 'RSD' });
  });

  it.each(['185000.00', '1,5', '1.50', '18.50,00', '', 'abc', '1.000,000'])(
    'rejects %j',
    (text) => {
      expect(parseSrAmount(text, 'EUR')._unsafeUnwrapErr().kind).toBe('unknown');
    },
  );
});
