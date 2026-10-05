import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http as rest, HttpResponse } from 'msw';
import { accountList, BANK, createTestHttp, legacyBankHandlers, server } from '@shared/test';
import { createLegacyBankAccounts } from './accounts.adapter';

const accounts = createLegacyBankAccounts(createTestHttp());

describe('legacy-bank accounts adapter', () => {
  beforeEach(() => server.use(...legacyBankHandlers));

  it('joins the list with one balance call per account (MESS-22..28)', async () => {
    const result = await accounts.listAccounts();
    expect(result._unsafeUnwrap()).toEqual([
      {
        number: '160-0000000123456-78',
        iban: 'RS66160000000012345678',
        name: 'Tekući račun',
        kind: 'current',
        currency: 'RSD',
        blocked: false,
        openedOn: '2019-03-14',
        balance: {
          available: { minor: 18_500_000n, currency: 'RSD' },
          booked: { minor: 18_625_000n, currency: 'RSD' },
        },
      },
      expect.objectContaining({ kind: 'savings', currency: 'EUR' }),
      expect.objectContaining({ kind: 'card', name: null }),
    ]);
  });

  it('normalises the IBAN and treats one with wrong check digits as drift', async () => {
    server.use(
      rest.get(`${BANK}/core/v2/acc/list`, () =>
        HttpResponse.json([{ ...accountList[0], IBAN: 'rs66 1600 0000 0012 3456 78' }]),
      ),
    );
    const [account] = (await accounts.listAccounts())._unsafeUnwrap();
    expect(account?.iban).toBe('RS66160000000012345678');

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    server.use(
      rest.get(`${BANK}/core/v2/acc/list`, () =>
        HttpResponse.json([{ ...accountList[0], IBAN: 'RS67160000000012345678' }]),
      ),
    );
    expect((await accounts.listAccounts())._unsafeUnwrapErr()).toEqual({
      kind: 'unknown',
      cause: 'schema_drift',
    });
    // Path and issue code only, never the value.
    expect(warn).toHaveBeenCalledWith(expect.any(String), ['0.IBAN: custom']);
    warn.mockRestore();
  });

  it('maps a blocked account (MESS-25)', async () => {
    server.use(
      rest.get(`${BANK}/core/v2/acc/list`, () =>
        HttpResponse.json([{ ...accountList[0], status: 'B' }]),
      ),
    );
    const [account] = (await accounts.listAccounts())._unsafeUnwrap();
    expect(account?.blocked).toBe(true);
  });

  it('fails as a whole when one balance is unavailable', async () => {
    server.use(
      rest.get(`${BANK}/core/v2/acc/160-0000000987654-32/bal`, () =>
        HttpResponse.html('<h1>Service Unavailable</h1>', {
          status: 503,
          headers: { 'Retry-After': '5' },
        }),
      ),
    );
    const result = await accounts.listAccounts();
    expect(result._unsafeUnwrapErr()).toEqual({ kind: 'unavailable', retryAfterMs: 5000 });
  });

  it('reports schema drift in the list as unknown (X-Mock-Scenario: drift)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    server.use(
      rest.get(`${BANK}/core/v2/acc/list`, () =>
        HttpResponse.json([{ acc_no_v2: '160-0000000123456-78', IBAN: 'x' }]),
      ),
    );
    const result = await accounts.listAccounts();
    expect(result._unsafeUnwrapErr().kind).toBe('unknown');
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('rejects an amount that is not in sr-RS format', async () => {
    server.use(
      rest.get(`${BANK}/core/v2/acc/:accNo/bal`, () =>
        HttpResponse.json({
          accountNumber: '160-0000000123456-78',
          availBal: '185000.00',
          bookBal: '185000.00',
          currency: 'RSD',
        }),
      ),
    );
    expect((await accounts.listAccounts())._unsafeUnwrapErr().kind).toBe('unknown');
  });

  it('maps an empty-body 401 to unauthenticated (MESS-10)', async () => {
    server.use(rest.get(`${BANK}/core/v2/acc/list`, () => new HttpResponse(null, { status: 401 })));
    expect((await accounts.listAccounts())._unsafeUnwrapErr()).toEqual({
      kind: 'unauthenticated',
    });
  });
});
