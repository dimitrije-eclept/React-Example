import { describe, expect, it } from 'vitest';
import { http as rest, HttpResponse } from 'msw';
import type { AccountNumber } from '@features/accounts';
import { BANK, createTestHttp, paymentHandlers, server } from '@shared/test';
import type { Iban } from '@shared/domain';
import type { PaymentId, PaymentOrder } from '../../domain/payment';
import { createLegacyBankPayments } from './payments.adapter';

const payments = createLegacyBankPayments(createTestHttp());

const order: PaymentOrder = {
  from: '160-0000000123456-78' as AccountNumber,
  recipientName: 'JKP INFOSTAN TEHNOLOGIJE',
  recipientIban: 'RS35105008123123123173' as Iban,
  amount: { minor: 741_860n, currency: 'RSD' },
  purposeCode: '289',
  reference: '97 123-456',
};

describe('legacy-bank payments adapter', () => {
  it('prepares with the amount as a JSON number (MESS-5, MESS-46)', async () => {
    const fixture = paymentHandlers();
    server.use(...fixture.handlers);
    const result = await payments.preparePayment(order);
    expect(result._unsafeUnwrap()).toEqual({
      paymentId: 'DOM-20261005-000001',
      maskedPhone: '+381 64 *** **67',
    });
    expect(fixture.inits[0]).toEqual({
      debtorAcc: '160-0000000123456-78',
      creditorIban: 'RS35105008123123123173',
      creditorName: 'JKP INFOSTAN TEHNOLOGIJE',
      amount: 7418.6,
      currency: 'RSD',
      purposeCode: '289',
      reference: '97 123-456',
      description: null,
    });
  });

  it('renames the bank field names in a 422 (MESS-48)', async () => {
    server.use(
      rest.post(`${BANK}/pay/dom/init`, () =>
        HttpResponse.json(
          { errors: [{ fld: 'creditorIban', msg: 'Neispravan IBAN primaoca' }] },
          { status: 422 },
        ),
      ),
    );
    expect((await payments.preparePayment(order))._unsafeUnwrapErr()).toEqual({
      kind: 'validation',
      fields: { recipientIban: 'Neispravan IBAN primaoca' },
    });
  });

  it('authorises, counts wrong codes, and locks on the third (MESS-49)', async () => {
    server.use(...paymentHandlers().handlers);
    const { paymentId } = (await payments.preparePayment(order))._unsafeUnwrap();
    expect((await payments.authorizePayment(paymentId, '000000'))._unsafeUnwrapErr()).toEqual({
      kind: 'wrong_code',
      attemptsLeft: 2,
    });
    await payments.authorizePayment(paymentId, '000000');
    expect((await payments.authorizePayment(paymentId, '000000'))._unsafeUnwrapErr()).toEqual({
      kind: 'locked',
    });
    expect((await payments.authorizePayment(paymentId, '123456'))._unsafeUnwrapErr()).toEqual({
      kind: 'not_awaiting_authorization',
    });
  });

  it('reads ERR_FUNDS sent with HTTP 200 at signing (MESS-50)', async () => {
    server.use(...paymentHandlers({ insufficientFunds: true }).handlers);
    const { paymentId } = (await payments.preparePayment(order))._unsafeUnwrap();
    expect((await payments.authorizePayment(paymentId, '123456'))._unsafeUnwrapErr()).toEqual({
      kind: 'insufficient_funds',
    });
  });

  it('follows the status until it is executed (MESS-52)', async () => {
    server.use(...paymentHandlers({ pollsUntilFinal: 1 }).handlers);
    const { paymentId } = (await payments.preparePayment(order))._unsafeUnwrap();
    expect((await payments.authorizePayment(paymentId, '123456')).isOk()).toBe(true);
    expect((await payments.getPaymentStatus(paymentId))._unsafeUnwrap().state).toBe('processing');
    const done = (await payments.getPaymentStatus(paymentId))._unsafeUnwrap();
    expect(done).toEqual({
      id: paymentId,
      state: 'executed',
      changedAt: new Date('2026-10-05T08:31:00Z'),
    });
    expect((await payments.getPaymentStatus('DOM-404' as PaymentId))._unsafeUnwrapErr()).toEqual({
      kind: 'not_found',
      resource: 'payment',
    });
  });
});
