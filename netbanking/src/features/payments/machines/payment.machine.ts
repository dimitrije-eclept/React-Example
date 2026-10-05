import { assign, fromPromise, setup } from 'xstate';
import type { DomainError, Result } from '@shared/domain';
import {
  isFinal,
  type AuthorizeError,
  type PaymentChallenge,
  type PaymentId,
  type PaymentOrder,
  type PaymentStatus,
  type PrepareError,
} from '../domain/payment';

export type PaymentOutcome =
  | { readonly kind: 'executed'; readonly at: Date }
  | { readonly kind: 'rejected'; readonly reason: 'insufficient_funds' | 'bank'; readonly at: Date }
  | { readonly kind: 'cancelled'; readonly at: Date }
  /** The bank no longer knows the payment, so its outcome can't be told from here. */
  | { readonly kind: 'not_found' };

/** Status checks before the machine stops polling and waits for "check again". */
export const MAX_STATUS_CHECKS = 20;

/** First wait between status checks; it doubles every few checks, up to `MAX_POLL_DELAY_MS`. */
export const POLL_BASE_MS = 2_000;
const MAX_POLL_DELAY_MS = 15_000;
const CHECKS_PER_STEP = 5;

/** 2 s ×5, 4 s ×5, 8 s ×5, then 15 s: about two and a half minutes in all. */
export function pollDelayMs(checks: number, baseMs = POLL_BASE_MS): number {
  return Math.min(baseMs * 2 ** Math.floor(checks / CHECKS_PER_STEP), MAX_POLL_DELAY_MS);
}

type Context = {
  readonly order?: PaymentOrder;
  readonly challenge?: PaymentChallenge;
  readonly preparedAt?: Date;
  readonly authorizedAt?: Date;
  readonly prepareError?: PrepareError;
  readonly codeError?: AuthorizeError;
  /** Latest status while processing. */
  readonly status?: PaymentStatus;
  /** The last status check failed; polling continues. */
  readonly pollError?: DomainError;
  /** Status checks since authorising (or since the last "check again"). */
  readonly statusChecks?: number;
  readonly outcome?: PaymentOutcome;
};

type Event =
  | { readonly type: 'REVIEW'; readonly order: PaymentOrder }
  | { readonly type: 'EDIT' }
  | { readonly type: 'SUBMIT_CODE'; readonly code: string }
  | { readonly type: 'NEW_PAYMENT' }
  /** After polling stopped: ask the bank once more. */
  | { readonly type: 'CHECK_STATUS' };

const notProvided = (name: string) => () => {
  throw new Error(`paymentMachine: provide the "${name}" actor`);
};

const outcomeOf = (status: PaymentStatus): PaymentOutcome | undefined => {
  switch (status.state) {
    case 'executed':
      return { kind: 'executed', at: status.changedAt };
    case 'rejected':
      return { kind: 'rejected', reason: 'bank', at: status.changedAt };
    case 'cancelled':
      return { kind: 'cancelled', at: status.changedAt };
    default:
      return undefined;
  }
};

/**
 * Domestic payment (ADR: prepare → authorise → status):
 * editing → preparing → awaitingCode ⇄ authorizing → processing ⇄ waiting → finished.
 * A locked code cancels the payment and missing funds reject it, both straight from authorising.
 * Polling backs off and stops after `MAX_STATUS_CHECKS` (→ stalled, until CHECK_STATUS); a payment
 * the bank no longer knows (404) ends it.
 * The actors are placeholders; the UI provides them from the PaymentsPort.
 */
export const paymentMachine = setup({
  types: { context: {} as Context, events: {} as Event },
  actors: {
    preparePayment: fromPromise<Result<PaymentChallenge, PrepareError>, PaymentOrder>(
      notProvided('preparePayment'),
    ),
    authorizePayment: fromPromise<
      Result<void, AuthorizeError>,
      { readonly id: PaymentId; readonly code: string }
    >(notProvided('authorizePayment')),
    getPaymentStatus: fromPromise<Result<PaymentStatus, DomainError>, PaymentId>(
      notProvided('getPaymentStatus'),
    ),
  },
  guards: {
    gaveUp: ({ context }) => (context.statusChecks ?? 0) >= MAX_STATUS_CHECKS,
  },
  delays: {
    // PEND → EXEC takes ~10 s on the mock-backend (MESS-52); a real bank may take much longer.
    pollInterval: ({ context }) => pollDelayMs(context.statusChecks ?? 0),
  },
}).createMachine({
  id: 'payment',
  context: {},
  initial: 'editing',
  on: {
    // `assign` merges, so every field is cleared explicitly.
    NEW_PAYMENT: {
      target: '.editing',
      actions: assign({
        order: undefined,
        challenge: undefined,
        preparedAt: undefined,
        authorizedAt: undefined,
        prepareError: undefined,
        codeError: undefined,
        status: undefined,
        pollError: undefined,
        statusChecks: undefined,
        outcome: undefined,
      }),
    },
  },
  states: {
    editing: {
      on: {
        REVIEW: {
          target: 'preparing',
          actions: assign(({ event }) => ({ order: event.order, prepareError: undefined })),
        },
      },
    },
    preparing: {
      invoke: {
        src: 'preparePayment',
        input: ({ context }) => {
          if (!context.order) throw new Error('No order to prepare');
          return context.order;
        },
        onDone: [
          {
            guard: ({ event }) => event.output.isOk(),
            target: 'awaitingCode',
            actions: assign(({ event }) => ({
              challenge: event.output.unwrapOr(undefined),
              preparedAt: new Date(),
              codeError: undefined,
            })),
          },
          {
            target: 'editing',
            actions: assign(({ event }) => ({
              prepareError: event.output.match(
                () => undefined,
                (error) => error,
              ),
            })),
          },
        ],
        onError: {
          target: 'editing',
          actions: assign({ prepareError: { kind: 'unknown' } }),
        },
      },
    },
    awaitingCode: {
      on: {
        SUBMIT_CODE: 'authorizing',
        // The prepared payment is abandoned; reviewing again prepares a new one.
        EDIT: {
          target: 'editing',
          actions: assign({ challenge: undefined, codeError: undefined }),
        },
      },
    },
    authorizing: {
      invoke: {
        src: 'authorizePayment',
        input: ({ context, event }) => {
          if (event.type !== 'SUBMIT_CODE' || !context.challenge) {
            throw new Error('Code submitted without a prepared payment');
          }
          return { id: context.challenge.paymentId, code: event.code };
        },
        onDone: [
          {
            guard: ({ event }) => event.output.isOk(),
            target: 'processing',
            actions: assign({
              authorizedAt: () => new Date(),
              codeError: undefined,
              statusChecks: 0,
            }),
          },
          {
            guard: ({ event }) =>
              event.output.isErr() && event.output.error.kind === 'not_awaiting_authorization',
            // Already authorised (e.g. a retried request): find out from the status.
            target: 'processing',
            actions: assign({ codeError: undefined, statusChecks: 0 }),
          },
          {
            guard: ({ event }) => event.output.isErr() && event.output.error.kind === 'locked',
            target: 'finished',
            actions: assign({ outcome: () => ({ kind: 'cancelled', at: new Date() }) }),
          },
          {
            guard: ({ event }) =>
              event.output.isErr() && event.output.error.kind === 'insufficient_funds',
            target: 'finished',
            actions: assign({
              outcome: () => ({ kind: 'rejected', reason: 'insufficient_funds', at: new Date() }),
            }),
          },
          {
            target: 'awaitingCode',
            actions: assign(({ event }) => ({
              codeError: event.output.match(
                () => undefined,
                (error) => error,
              ),
            })),
          },
        ],
        onError: { target: 'awaitingCode', actions: assign({ codeError: { kind: 'unknown' } }) },
      },
    },
    processing: {
      invoke: {
        src: 'getPaymentStatus',
        input: ({ context }) => {
          if (!context.challenge) throw new Error('No payment to follow');
          return context.challenge.paymentId;
        },
        onDone: [
          {
            guard: ({ event }) => event.output.isOk() && isFinal(event.output.value.state),
            target: 'finished',
            actions: assign(({ event }) => {
              const status = event.output.unwrapOr(undefined);
              return { status, pollError: undefined, outcome: status && outcomeOf(status) };
            }),
          },
          {
            guard: ({ event }) => event.output.isErr() && event.output.error.kind === 'not_found',
            target: 'finished',
            actions: assign({ pollError: undefined, outcome: { kind: 'not_found' } }),
          },
          {
            target: 'waiting',
            actions: assign(({ context, event }) => ({
              statusChecks: (context.statusChecks ?? 0) + 1,
              ...event.output.match(
                (status) => ({ status, pollError: undefined }),
                (error) => ({ pollError: error }),
              ),
            })),
          },
        ],
        onError: {
          target: 'waiting',
          actions: assign(({ context }) => ({
            statusChecks: (context.statusChecks ?? 0) + 1,
            pollError: { kind: 'unknown' },
          })),
        },
      },
    },
    waiting: {
      always: { guard: 'gaveUp', target: 'stalled' },
      after: { pollInterval: 'processing' },
    },
    /** Still processing after every check: the customer can ask again, or look at the history. */
    stalled: {
      on: {
        CHECK_STATUS: {
          target: 'processing',
          actions: assign({ statusChecks: 0, pollError: undefined }),
        },
      },
    },
    finished: {},
  },
});
