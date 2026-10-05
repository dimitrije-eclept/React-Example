import { describe, expect, it } from 'vitest';
import { http as rest, HttpResponse } from 'msw';
import type { AccountNumber } from '@features/accounts';
import { BANK, createTestHttp, historyHandler, server } from '@shared/test';
import { createLegacyBankTransactions } from './transactions.adapter';

const transactions = createLegacyBankTransactions(createTestHttp());
const account = '160-0000000123456-78' as AccountNumber;

describe('legacy-bank transactions adapter', () => {
  it('sends dotted dates, dc and the 1-based page (MESS-31, MESS-32)', async () => {
    let query: URLSearchParams | undefined;
    server.use(
      rest.get(`${BANK}/core/v1/txn/history`, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({ items: [], page: 2, totalPages: 0 });
      }),
    );
    await transactions.listTransactions({
      account,
      from: '2026-07-05',
      to: '2026-10-05',
      direction: 'in',
      page: 2,
    });
    expect(Object.fromEntries(query!)).toEqual({
      acc: account,
      dateFrom: '05.07.2026',
      dateTo: '05.10.2026',
      dc: 'C',
      page: '2',
    });
  });

  it('leaves out open-ended filters', async () => {
    let query: URLSearchParams | undefined;
    server.use(
      rest.get(`${BANK}/core/v1/txn/history`, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({ items: [], page: 1, totalPages: 0 });
      }),
    );
    await transactions.listTransactions({ account, page: 1 });
    expect([...query!.keys()]).toEqual(['acc', 'page']);
  });

  it('returns a page with signed amounts', async () => {
    server.use(historyHandler());
    const result = (await transactions.listTransactions({ account, page: 1 }))._unsafeUnwrap();
    expect(result.page).toBe(1);
    expect(result.pageCount).toBe(2);
    expect(result.items).toHaveLength(20);
    expect(result.items[0]).toMatchObject({
      reference: 'TX20261005-000094',
      amount: { minor: -65_001n, currency: 'RSD' },
      status: 'pending',
    });
  });

  it('maps 422 field errors and 404 accounts (MESS-38)', async () => {
    server.use(
      rest.get(`${BANK}/core/v1/txn/history`, () =>
        HttpResponse.json(
          { errors: [{ fld: 'dateFrom', msg: 'Format datuma je dd.MM.yyyy' }] },
          { status: 422 },
        ),
      ),
    );
    expect((await transactions.listTransactions({ account, page: 1 }))._unsafeUnwrapErr()).toEqual({
      kind: 'validation',
      fields: { dateFrom: 'Format datuma je dd.MM.yyyy' },
    });

    server.use(historyHandler({}));
    expect((await transactions.listTransactions({ account, page: 1 }))._unsafeUnwrapErr()).toEqual({
      kind: 'not_found',
      resource: 'account',
    });
  });
});
