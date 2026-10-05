import { describe, expect, it } from 'vitest';
import { fromBelgradeDateTime, toPaymentStatus } from './mappers';

describe('payment mappers', () => {
  it('reads stateDt as Belgrade local time (MESS-8, MESS-52)', () => {
    // Summer time: UTC+2.
    expect(fromBelgradeDateTime('02.10.2026 14:33').toISOString()).toBe('2026-10-02T12:33:00.000Z');
    // Winter time: UTC+1.
    expect(fromBelgradeDateTime('15.01.2026 09:05').toISOString()).toBe('2026-01-15T08:05:00.000Z');
  });

  it.each([
    ['INIT', 'awaiting_authorization'],
    ['PEND', 'processing'],
    ['EXEC', 'executed'],
    ['REJ', 'rejected'],
    ['CANC', 'cancelled'],
  ] as const)('maps %s to %s (MESS-7)', (code, state) => {
    expect(
      toPaymentStatus({ paymentRef: 'DOM-1', state: code, stateDt: '02.10.2026 14:33' }).state,
    ).toBe(state);
  });
});
