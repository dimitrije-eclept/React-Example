import { describe, expect, it } from 'vitest';
import { createActor, fromPromise, waitFor } from 'xstate';
import { err, ok, type DomainError, type Result } from '@shared/domain';
import type {
  AuthorizeError,
  PaymentChallenge,
  PaymentId,
  PaymentOrder,
  PaymentStatus,
  PrepareError,
} from '../domain/payment';
import { MAX_STATUS_CHECKS, paymentMachine, pollDelayMs } from './payment.machine';

const order = { from: '160-1', recipientName: 'X' } as unknown as PaymentOrder;
const paymentId = 'DOM-1' as PaymentId;

function start(statuses: () => Result<PaymentStatus, DomainError>) {
  let checks = 0;
  const actor = createActor(
    paymentMachine.provide({
      actors: {
        preparePayment: fromPromise(async (): Promise<Result<PaymentChallenge, PrepareError>> =>
          ok({ paymentId, maskedPhone: '+381' }),
        ),
        authorizePayment: fromPromise(async (): Promise<Result<void, AuthorizeError>> =>
          ok(undefined),
        ),
        getPaymentStatus: fromPromise(async () => {
          checks += 1;
          return statuses();
        }),
      },
      delays: { pollInterval: 1 },
    }),
  ).start();
  actor.send({ type: 'REVIEW', order });
  return { actor, checks: () => checks };
}

const processing = (): Result<PaymentStatus, DomainError> =>
  ok({ id: paymentId, state: 'processing', changedAt: new Date() });

describe('payment machine', () => {
  it('backs off between status checks, up to a ceiling', () => {
    expect([0, 4, 5, 10, 15, 30].map((checks) => pollDelayMs(checks))).toEqual([
      2_000, 2_000, 4_000, 8_000, 15_000, 15_000,
    ]);
  });

  it('stops polling after the last check and asks again on CHECK_STATUS', async () => {
    const { actor, checks } = start(processing);
    await waitFor(actor, (snapshot) => snapshot.matches('awaitingCode'));
    actor.send({ type: 'SUBMIT_CODE', code: '123456' });

    await waitFor(actor, (snapshot) => snapshot.matches('stalled'));
    expect(checks()).toBe(MAX_STATUS_CHECKS);

    actor.send({ type: 'CHECK_STATUS' });
    expect(actor.getSnapshot().matches('processing')).toBe(true);
    await waitFor(actor, (snapshot) => snapshot.matches('stalled'));
    expect(checks()).toBe(2 * MAX_STATUS_CHECKS);
  });

  it('ends when the bank no longer knows the payment', async () => {
    const { actor, checks } = start(() => err({ kind: 'not_found', resource: 'payment' }));
    await waitFor(actor, (snapshot) => snapshot.matches('awaitingCode'));
    actor.send({ type: 'SUBMIT_CODE', code: '123456' });

    const done = await waitFor(actor, (snapshot) => snapshot.matches('finished'));
    expect(done.context.outcome).toEqual({ kind: 'not_found' });
    expect(checks()).toBe(1);
  });

  it('keeps polling through failed checks', async () => {
    let calls = 0;
    const { actor } = start(() =>
      ++calls < 3
        ? err({ kind: 'unavailable' })
        : ok({ id: paymentId, state: 'executed', changedAt: new Date() }),
    );
    await waitFor(actor, (snapshot) => snapshot.matches('awaitingCode'));
    actor.send({ type: 'SUBMIT_CODE', code: '123456' });
    const done = await waitFor(actor, (snapshot) => snapshot.matches('finished'));
    expect(done.context.outcome).toMatchObject({ kind: 'executed' });
    expect(done.context.pollError).toBeUndefined();
  });

  it('forgets everything on NEW_PAYMENT', async () => {
    const { actor } = start(() => err({ kind: 'not_found', resource: 'payment' }));
    await waitFor(actor, (snapshot) => snapshot.matches('awaitingCode'));
    actor.send({ type: 'SUBMIT_CODE', code: '123456' });
    await waitFor(actor, (snapshot) => snapshot.matches('finished'));
    actor.send({ type: 'NEW_PAYMENT' });
    expect(actor.getSnapshot().matches('editing')).toBe(true);
    expect(Object.values(actor.getSnapshot().context).every((v) => v === undefined)).toBe(true);
  });
});
