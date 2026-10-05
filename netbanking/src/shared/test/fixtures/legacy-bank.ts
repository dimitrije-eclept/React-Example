import { http as rest, HttpResponse } from 'msw';

/** Base URL tests point the HTTP client at. */
export const BANK = 'http://bank.test';

// Payloads recorded from the mock-backend seed data (2026-10-05).
export const accountList = [
  {
    acc_no: '160-0000000123456-78',
    IBAN: 'RS66160000000012345678',
    descr: 'Tekući račun',
    prodType: 'TR',
    ccy: 'RSD',
    status: 'A',
    openDt: '2019-03-14T00:00:00',
  },
  {
    acc_no: '160-0000000987654-32',
    IBAN: 'RS59160000000098765432',
    descr: 'Devizna štednja',
    prodType: 'ST',
    ccy: 'EUR',
    status: 'A',
    openDt: '2021-06-01T00:00:00',
  },
  {
    acc_no: '160-0000000555555-11',
    IBAN: 'RS38160000000055555511',
    descr: null,
    prodType: 'KK',
    ccy: 'RSD',
    status: 'A',
    openDt: '2023-11-20T00:00:00',
  },
];

export const balances: Record<string, object> = {
  '160-0000000123456-78': {
    accountNumber: '160-0000000123456-78',
    availBal: '185.000,00',
    bookBal: '186.250,00',
    currency: 'RSD',
  },
  '160-0000000987654-32': {
    accountNumber: '160-0000000987654-32',
    availBal: '4.200,00',
    bookBal: '4.200,00',
    currency: 'EUR',
  },
  '160-0000000555555-11': {
    accountNumber: '160-0000000555555-11',
    availBal: '22.500,00',
    bookBal: '22.500,00',
    currency: 'RSD',
  },
};

export const profileEnvelope = {
  USER: {
    FirstName: 'Marko',
    LastName: 'Petrović',
    eMail: 'marko.petrovic@example.rs',
    Phone: '+381641234567',
    lastLogin: '1791186828',
  },
};

export const tokenResponse = {
  access_token: 'a1',
  refresh_token: 'r1',
  expires_in: 300,
  token_type: 'bearer',
};

/** Shape of one `/core/v1/txn/history` item. */
export type TxnFixture = {
  txnRef: string;
  bookDate: string;
  valDate: string;
  amt: string;
  dc: 'D' | 'C';
  ccy: string;
  partnerName: string | null;
  partnerAcc: string | null;
  purpose: string | null;
  state: 'B' | 'P';
};

// The first items recorded for the current account; the rest pads the history to two pages.
export const currentAccountHistory: TxnFixture[] = [
  {
    txnRef: 'TX20261005-000094',
    bookDate: '05.10.2026',
    valDate: '20261006',
    amt: '650,01',
    dc: 'D',
    ccy: 'RSD',
    partnerName: 'WOLT BEOGRAD',
    partnerAcc: null,
    purpose: 'Kupovina karticom',
    state: 'P',
  },
  {
    txnRef: 'TX20261005-000093',
    bookDate: '05.10.2026',
    valDate: '20261006',
    amt: '499,99',
    dc: 'D',
    ccy: 'RSD',
    partnerName: 'MAXI 112',
    partnerAcc: null,
    purpose: 'Kupovina karticom',
    state: 'P',
  },
  {
    txnRef: 'TX20261004-000095',
    bookDate: '04.10.2026',
    valDate: '20261005',
    amt: '100,00',
    dc: 'D',
    ccy: 'RSD',
    partnerName: 'LIDL 0215 NOVI BEOGRAD',
    partnerAcc: null,
    purpose: 'Kupovina karticom',
    state: 'P',
  },
  {
    txnRef: 'TX20260930-000087',
    bookDate: '30.09.2026',
    valDate: '20261002',
    amt: '4.749,24',
    dc: 'D',
    ccy: 'RSD',
    partnerName: 'MAXI 087 VRACAR',
    partnerAcc: null,
    purpose: null,
    state: 'B',
  },
  {
    txnRef: 'TX20260930-000001',
    bookDate: '30.09.2026',
    valDate: '20260930',
    amt: '170.786,62',
    dc: 'C',
    ccy: 'RSD',
    partnerName: 'ECLEPT D.O.O.',
    partnerAcc: '265-1100310008899-21',
    purpose: 'Zarada za prethodni mesec',
    state: 'B',
  },
  {
    txnRef: 'TX20260928-000050',
    bookDate: '28.09.2026',
    valDate: '20260930',
    amt: '1.061,17',
    dc: 'D',
    ccy: 'RSD',
    partnerName: null,
    partnerAcc: null,
    purpose: null,
    state: 'B',
  },
  ...Array.from({ length: 19 }, (_, index): TxnFixture => {
    const day = String(27 - index).padStart(2, '0');
    return {
      txnRef: `TX202609${day}-1${String(index).padStart(5, '0')}`,
      bookDate: `${day}.09.2026`,
      valDate: `202609${day}`,
      amt: `${index + 1}.000,00`,
      dc: 'D',
      ccy: 'RSD',
      partnerName: `MERCHANT ${index + 1}`,
      partnerAcc: null,
      purpose: 'Kupovina karticom',
      state: 'B',
    };
  }),
];

const PAGE_SIZE = 20;
const dotted = /^\d{2}\.\d{2}\.\d{4}$/;
const isoOf = (text: string) => text.split('.').reverse().join('-');

/** Behaves like the real endpoint: dotted dates (422 otherwise), `dc` filter, 20 per page. */
export function historyHandler(
  history: Record<string, TxnFixture[]> = { '160-0000000123456-78': currentAccountHistory },
) {
  return rest.get(`${BANK}/core/v1/txn/history`, ({ request }) => {
    const query = new URL(request.url).searchParams;
    const items = history[query.get('acc') ?? ''];
    if (items === undefined) return HttpResponse.json({ code: 'ACC_NOT_FOUND' }, { status: 404 });
    for (const field of ['dateFrom', 'dateTo']) {
      const value = query.get(field);
      if (value !== null && !dotted.test(value)) {
        return HttpResponse.json(
          { errors: [{ fld: field, msg: 'Format datuma je dd.MM.yyyy' }] },
          { status: 422 },
        );
      }
    }
    const from = query.get('dateFrom');
    const to = query.get('dateTo');
    const dc = query.get('dc');
    const page = Number(query.get('page') ?? 1);
    const matching = items.filter(
      (item) =>
        (!dc || item.dc === dc) &&
        (!from || isoOf(item.bookDate) >= isoOf(from)) &&
        (!to || isoOf(item.bookDate) <= isoOf(to)),
    );
    return HttpResponse.json({
      items: matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      page,
      totalPages: Math.ceil(matching.length / PAGE_SIZE),
    });
  });
}

export type TransferCall = { readonly key: string | null; readonly body: Record<string, unknown> };

/**
 * `POST /pay/internal/exec` like the mock-backend: requires an Idempotency-Key, replays the first
 * response for a known key (MESS-43), returns business errors with HTTP 200 (MESS-40).
 */
export function transferHandler(
  respond: (call: TransferCall) => Response = () =>
    HttpResponse.json({ ref: 'INT-20261005-000001', ts: '2026-10-05T10:31:07+02:00' }),
) {
  const calls: TransferCall[] = [];
  const replies = new Map<string, Response>();
  const handler = rest.post(`${BANK}/pay/internal/exec`, async ({ request }) => {
    const key = request.headers.get('Idempotency-Key');
    const call = { key, body: (await request.json()) as Record<string, unknown> };
    calls.push(call);
    if (!key) return HttpResponse.json({ code: 'IDEMPOTENCY_KEY_MISSING' }, { status: 400 });
    const replay = replies.get(key);
    if (replay) return replay.clone();
    const response = respond(call);
    if (response.status === 200) replies.set(key, response.clone());
    return response;
  });
  return { handler, calls };
}

type PaymentFixtureOptions = {
  /** `stat` answers PEND this many times before the final state. */
  readonly pollsUntilFinal?: number;
  /** Signing reports ERR_FUNDS (MESS-50). */
  readonly insufficientFunds?: boolean;
};

/**
 * `/pay/dom/*` like the mock-backend: OTP 123456 with 3 attempts (third failure cancels),
 * ERR_FUNDS with HTTP 200 at signing, PEND → EXEC (or REJ for RS81999…99) after a few polls.
 */
export function paymentHandlers({
  pollsUntilFinal = 2,
  insufficientFunds = false,
}: PaymentFixtureOptions = {}) {
  type Payment = {
    state: 'INIT' | 'PEND' | 'EXEC' | 'REJ' | 'CANC';
    failures: number;
    polls: number;
    iban: string;
  };
  const payments = new Map<string, Payment>();
  const inits: Record<string, unknown>[] = [];
  const stateDt = '05.10.2026 10:31';
  const handlers = [
    rest.post(`${BANK}/pay/dom/init`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      inits.push(body);
      const ref = `DOM-20261005-${String(payments.size + 1).padStart(6, '0')}`;
      payments.set(ref, { state: 'INIT', failures: 0, polls: 0, iban: String(body.creditorIban) });
      return HttpResponse.json({
        paymentRef: ref,
        scaRequired: 'Y',
        scaMethod: 'SMS_OTP',
        maskedPhone: '+381 64 *** **67',
      });
    }),
    rest.post(`${BANK}/pay/dom/:ref/sign`, async ({ params, request }) => {
      const payment = payments.get(String(params.ref));
      if (!payment) return HttpResponse.json({ code: 'PAY_NOT_FOUND' }, { status: 404 });
      if (payment.state !== 'INIT')
        return HttpResponse.json({ code: 'PAY_STATE', message: payment.state }, { status: 409 });
      const { otp } = (await request.json()) as { otp: string };
      if (otp !== '123456') {
        payment.failures += 1;
        if (payment.failures >= 3) {
          payment.state = 'CANC';
          return HttpResponse.json({ code: 'OTP_LOCKED' }, { status: 403 });
        }
        return HttpResponse.json(
          { code: 'OTP_INVALID', attemptsLeft: 3 - payment.failures },
          { status: 403 },
        );
      }
      if (insufficientFunds) {
        payment.state = 'REJ';
        return HttpResponse.json({ status: 'ERROR', errCode: 'ERR_FUNDS' });
      }
      payment.state = 'PEND';
      return HttpResponse.json({ paymentRef: params.ref, state: 'PEND' });
    }),
    rest.get(`${BANK}/pay/dom/:ref/stat`, ({ params }) => {
      const payment = payments.get(String(params.ref));
      if (!payment) return HttpResponse.json({ code: 'PAY_NOT_FOUND' }, { status: 404 });
      if (payment.state === 'PEND') {
        payment.polls += 1;
        if (payment.polls > pollsUntilFinal) {
          payment.state = payment.iban === 'RS81999000000000000099' ? 'REJ' : 'EXEC';
        }
      }
      return HttpResponse.json({ paymentRef: params.ref, state: payment.state, stateDt });
    }),
  ];
  return { handlers, inits, payments };
}

/**
 * `/cards/*` like the mock-backend: a read via POST (MESS-54), Y/N flags, and an unknown masked
 * number answered with HTTP 200 `{result:"NOK"}` (MESS-56).
 */
export function cardHandlers() {
  const cards = [
    {
      pan: '4111********1111',
      expiry: '12/27',
      type: 'DEBIT',
      linkedAcc: '160-0000000123456-78',
      blocked: 'N',
      limit: null as string | null,
    },
    {
      pan: '5555********4444',
      expiry: '08/28',
      type: 'CREDIT',
      linkedAcc: '160-0000000555555-11',
      blocked: 'N',
      limit: '150.000,00',
    },
  ];
  const blockCalls: Record<string, unknown>[] = [];
  const handlers = [
    rest.post(`${BANK}/cards/getCards`, () => HttpResponse.json({ cardList: cards })),
    rest.post(`${BANK}/cards/block`, async ({ request }) => {
      const body = (await request.json()) as { pan: string; block: 'Y' | 'N' };
      blockCalls.push(body);
      const card = cards.find((candidate) => candidate.pan === body.pan);
      if (!card) return HttpResponse.json({ result: 'NOK' });
      card.blocked = body.block;
      return HttpResponse.json({ result: 'OK' });
    }),
  ];
  return { handlers, cards, blockCalls };
}

/** The happy path of every endpoint so far. Override single endpoints with `server.use`. */
export const legacyBankHandlers = [
  rest.post(`${BANK}/auth/login`, () =>
    HttpResponse.json({
      loginTicket: 't1',
      otpRequired: true,
      otpChannel: 'SMS',
      maskedPhone: '+381 64 *** **67',
    }),
  ),
  rest.post(`${BANK}/auth/otp`, async ({ request }) => {
    const { otp } = (await request.json()) as { otp: string };
    return otp === '123456'
      ? HttpResponse.json(tokenResponse)
      : HttpResponse.json({ code: 'OTP_INVALID', attemptsLeft: 2 }, { status: 403 });
  }),
  rest.post(`${BANK}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  rest.get(`${BANK}/core/v2/acc/list`, () => HttpResponse.json(accountList)),
  rest.get(`${BANK}/core/v2/acc/:accNo/bal`, ({ params }) => {
    const balance = balances[String(params.accNo)];
    return balance
      ? HttpResponse.json(balance)
      : HttpResponse.json({ code: 'ACC_NOT_FOUND' }, { status: 404 });
  }),
  rest.get(`${BANK}/usr/profile`, () => HttpResponse.json(profileEnvelope)),
  historyHandler({
    '160-0000000123456-78': currentAccountHistory,
    '160-0000000987654-32': [],
    '160-0000000555555-11': [],
  }),
  transferHandler().handler,
  ...paymentHandlers().handlers,
  ...cardHandlers().handlers,
];
