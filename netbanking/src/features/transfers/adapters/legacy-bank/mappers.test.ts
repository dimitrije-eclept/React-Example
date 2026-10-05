import { describe, expect, it } from 'vitest';
import { toTransferValidation } from './mappers';

describe('transfer mappers', () => {
  it("renames the bank's 422 field names to the request's (MESS-3, MESS-44)", () => {
    expect(
      toTransferValidation({
        kind: 'validation',
        fields: { srcAcc: 'a', dstAcc: 'b', amt: 'c', descr: 'd', other: 'e' },
      }),
    ).toEqual({
      kind: 'validation',
      fields: { from: 'a', to: 'b', amount: 'c', description: 'd', other: 'e' },
    });
  });

  it('leaves other errors alone', () => {
    expect(toTransferValidation({ kind: 'unavailable' })).toEqual({ kind: 'unavailable' });
  });
});
