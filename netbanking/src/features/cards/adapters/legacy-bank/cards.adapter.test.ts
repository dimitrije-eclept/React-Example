import { beforeEach, describe, expect, it } from 'vitest';
import { cardHandlers, createTestHttp, legacyBankHandlers, server } from '@shared/test';
import type { CardId } from '../../domain/card';
import { createLegacyBankCards } from './cards.adapter';

const cards = createLegacyBankCards(createTestHttp());

describe('legacy-bank cards adapter', () => {
  beforeEach(() => server.use(...legacyBankHandlers));

  it('maps cards, taking the limit currency from the linked account (MESS-54, MESS-55)', async () => {
    expect((await cards.listCards())._unsafeUnwrap()).toEqual([
      {
        id: '4111********1111',
        kind: 'debit',
        network: 'visa',
        lastFour: '1111',
        expires: { month: 12, year: 2027 },
        linkedAccount: '160-0000000123456-78',
        blocked: false,
        creditLimit: null,
      },
      {
        id: '5555********4444',
        kind: 'credit',
        network: 'mastercard',
        lastFour: '4444',
        expires: { month: 8, year: 2028 },
        linkedAccount: '160-0000000555555-11',
        blocked: false,
        creditLimit: { minor: 15_000_000n, currency: 'RSD' },
      },
    ]);
  });

  it('blocks with Y/N by masked number, and reads NOK as not found (MESS-56)', async () => {
    const fixture = cardHandlers();
    server.use(...fixture.handlers);
    expect((await cards.setBlocked('4111********1111' as CardId, true)).isOk()).toBe(true);
    expect(fixture.blockCalls[0]).toEqual({ pan: '4111********1111', block: 'Y' });
    expect(fixture.cards[0]?.blocked).toBe('Y');

    expect((await cards.setBlocked('4111********9999' as CardId, true))._unsafeUnwrapErr()).toEqual(
      {
        kind: 'not_found',
        resource: 'card',
      },
    );
  });
});
