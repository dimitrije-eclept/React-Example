import { describe, expect, it } from 'vitest';
import { parseAmountInput } from './amount-input';

describe('parseAmountInput', () => {
  it.each([
    ['15.000,00', 1_500_000n],
    ['15000', 1_500_000n],
    ['15.000', 1_500_000n],
    ['1.500,5', 150_050n],
    ['1500,50', 150_050n],
    ['1500.50', 150_050n],
    ['1500.5', 150_050n],
    [' 1 500,00 ', 150_000n],
    ['0,01', 1n],
    [',50', null],
    ['', null],
    ['abc', null],
    ['1,234', null],
    ['1.2345', null],
    ['15,000.00', null],
    ['1.50.00', null],
    ['-5', null],
  ])('%j → %s', (text, minor) => {
    const parsed = parseAmountInput(text, 'RSD');
    expect(parsed === null ? null : parsed.minor).toBe(minor);
  });
});
