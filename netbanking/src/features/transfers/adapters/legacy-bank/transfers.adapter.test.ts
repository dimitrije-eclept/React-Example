import { describe, expect, it } from 'vitest';
import { delay, http as rest, HttpResponse } from 'msw';
import type { AccountNumber } from '@features/accounts';
import { createHttp } from '@shared/api';
import { BANK, createTestHttp, server, transferHandler } from '@shared/test';
import type { TransferRequest } from '../../domain/transfer';
import { createLegacyBankTransfers } from './transfers.adapter';

const transfers = createLegacyBankTransfers(createTestHttp());

const request: TransferRequest = {
  from: '160-0000000123456-78' as AccountNumber,
  to: '160-0000000555555-11' as AccountNumber,
  amount: { minor: 1_500_050n, currency: 'RSD' },
  idempotencyKey: 'key-1',
};

describe('legacy-bank transfers adapter', () => {
  it('sends a dot-decimal string amount and the idempotency key (MESS-5, MESS-39, MESS-42)', async () => {
    const { handler, calls } = transferHandler();
    server.use(handler);
    const result = await transfers.transfer(request);
    expect(calls).toEqual([
      {
        key: 'key-1',
        body: {
          srcAcc: '160-0000000123456-78',
          dstAcc: '160-0000000555555-11',
          amt: '15000.50',
          ccy: 'RSD',
          descr: null,
        },
      },
    ]);
    expect(result._unsafeUnwrap()).toEqual({
      reference: 'INT-20261005-000001',
      executedAt: new Date('2026-10-05T08:31:07Z'),
    });
  });

  it.each([
    [
      { status: 'ERROR', errCode: 'ERR_FUNDS', errMsg: 'Nedovoljno sredstava' },
      'insufficient_funds',
    ],
    [{ status: 'ERROR', errCode: 'ERR_CCY' }, 'currency_mismatch'],
  ])('reads a business error sent with HTTP 200 (MESS-40): %o', async (body, kind) => {
    server.use(transferHandler(() => HttpResponse.json(body)).handler);
    expect((await transfers.transfer(request))._unsafeUnwrapErr().kind).toBe(kind);
  });

  it('maps 422 with domain field names, and 404 (MESS-44)', async () => {
    server.use(
      transferHandler(() =>
        HttpResponse.json(
          { errors: [{ fld: 'dstAcc', msg: 'Račun primaoca mora biti različit' }] },
          { status: 422 },
        ),
      ).handler,
    );
    expect((await transfers.transfer(request))._unsafeUnwrapErr()).toMatchObject({
      kind: 'validation',
      fields: { to: expect.any(String) },
    });

    server.use(
      transferHandler(() => HttpResponse.json({ code: 'ACC_NOT_FOUND' }, { status: 404 })).handler,
    );
    expect((await transfers.transfer(request))._unsafeUnwrapErr()).toEqual({
      kind: 'not_found',
      resource: 'account',
    });
  });

  it('sends the description when there is one', async () => {
    const { handler, calls } = transferHandler();
    server.use(handler);
    await transfers.transfer({ ...request, description: 'Štednja' });
    expect(calls[0]?.body.descr).toBe('Štednja');
  });

  it('reports a request that times out as unavailable, i.e. an unknown outcome', async () => {
    server.use(
      rest.post(`${BANK}/pay/internal/exec`, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    const impatient = createLegacyBankTransfers(
      createHttp({
        baseUrl: BANK,
        timeoutMs: 20,
        auth: {
          getAccessToken: () => 'test-token',
          refresh: async () => false,
          onUnauthorized() {},
        },
      }),
    );
    expect((await impatient.transfer(request))._unsafeUnwrapErr()).toEqual({ kind: 'unavailable' });
  });
});
