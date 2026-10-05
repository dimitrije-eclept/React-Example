import { describe, expect, it } from 'vitest';
import { fromCompactDate, fromDottedDate, toDottedDate, toTransaction } from './mappers';
import type { TxnItem } from './schemas';

const item: TxnItem = {
  txnRef: 'TX20260930-000001',
  bookDate: '30.09.2026',
  valDate: '20261002',
  amt: '170.786,62',
  dc: 'C',
  ccy: 'RSD',
  partnerName: 'ECLEPT D.O.O.',
  partnerAcc: '265-1100310008899-21',
  purpose: 'Zarada za prethodni mesec',
  state: 'B',
};

describe('transaction mappers', () => {
  it('converts the three date formats (MESS-31, MESS-33)', () => {
    expect(fromDottedDate('14.09.2026')).toBe('2026-09-14');
    expect(toDottedDate('2026-09-14')).toBe('14.09.2026');
    expect(fromCompactDate('20260915')).toBe('2026-09-15');
  });

  it('signs the amount from dc (MESS-34)', () => {
    expect(toTransaction(item)._unsafeUnwrap().amount).toEqual({
      minor: 17_078_662n,
      currency: 'RSD',
    });
    expect(toTransaction({ ...item, dc: 'D' })._unsafeUnwrap().amount.minor).toBe(-17_078_662n);
  });

  it('maps state and keeps missing counterparty data as null (MESS-35, MESS-36)', () => {
    const pending = toTransaction({
      ...item,
      state: 'P',
      partnerName: null,
      partnerAcc: null,
      purpose: null,
    })._unsafeUnwrap();
    expect(pending).toMatchObject({
      status: 'pending',
      bookedOn: '2026-09-30',
      valueOn: '2026-10-02',
      counterpartyName: null,
      counterpartyAccount: null,
      description: null,
    });
  });
});
