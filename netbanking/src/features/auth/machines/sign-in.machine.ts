import { assign, fromPromise, setup } from 'xstate';
import type { Result } from '@shared/domain';
import type {
  AuthTokens,
  Credentials,
  CredentialsError,
  OtpChallenge,
  OtpError,
} from '../domain/sign-in';

type Context = {
  readonly challenge?: OtpChallenge;
  readonly credentialsError?: CredentialsError;
  readonly otpError?: OtpError;
  readonly tokens?: AuthTokens;
};

type Event =
  | { readonly type: 'SUBMIT_CREDENTIALS'; readonly credentials: Credentials }
  | { readonly type: 'SUBMIT_OTP'; readonly code: string }
  | { readonly type: 'RESTART' };

const notProvided = (name: string) => () => {
  throw new Error(`signInMachine: provide the "${name}" actor`);
};

/**
 * credentials → (check) → otp → (verify) → signedIn. A locked or expired code can only restart.
 * The actors are placeholders; the UI provides them from the AuthPort.
 */
export const signInMachine = setup({
  types: {
    context: {} as Context,
    events: {} as Event,
    output: {} as AuthTokens,
  },
  actors: {
    startSignIn: fromPromise<Result<OtpChallenge, CredentialsError>, Credentials>(
      notProvided('startSignIn'),
    ),
    confirmSignIn: fromPromise<
      Result<AuthTokens, OtpError>,
      { readonly challenge: OtpChallenge; readonly code: string }
    >(notProvided('confirmSignIn')),
  },
  guards: {
    canRetryCode: ({ context }) =>
      context.otpError?.kind !== 'locked' && context.otpError?.kind !== 'expired',
  },
}).createMachine({
  id: 'signIn',
  context: {},
  output: ({ context }) => {
    if (context.tokens === undefined) throw new Error('Signed in without tokens');
    return context.tokens;
  },
  initial: 'credentials',
  states: {
    credentials: {
      on: { SUBMIT_CREDENTIALS: 'checkingCredentials' },
    },
    checkingCredentials: {
      invoke: {
        src: 'startSignIn',
        input: ({ event }) => {
          if (event.type !== 'SUBMIT_CREDENTIALS') throw new Error(`Unexpected ${event.type}`);
          return event.credentials;
        },
        onDone: [
          {
            guard: ({ event }) => event.output.isOk(),
            target: 'otp',
            actions: assign(({ event }) => ({
              challenge: event.output.unwrapOr(undefined),
              credentialsError: undefined,
              otpError: undefined,
            })),
          },
          {
            target: 'credentials',
            actions: assign(({ event }) => ({
              credentialsError: event.output.match(
                () => undefined,
                (error) => error,
              ),
            })),
          },
        ],
        onError: {
          target: 'credentials',
          actions: assign({ credentialsError: { kind: 'unknown' } }),
        },
      },
    },
    otp: {
      on: {
        SUBMIT_OTP: { guard: 'canRetryCode', target: 'verifyingCode' },
        RESTART: {
          target: 'credentials',
          actions: assign({
            challenge: undefined,
            credentialsError: undefined,
            otpError: undefined,
          }),
        },
      },
    },
    verifyingCode: {
      invoke: {
        src: 'confirmSignIn',
        input: ({ context, event }) => {
          if (event.type !== 'SUBMIT_OTP' || context.challenge === undefined) {
            throw new Error('Code submitted without a challenge');
          }
          return { challenge: context.challenge, code: event.code };
        },
        onDone: [
          {
            guard: ({ event }) => event.output.isOk(),
            target: 'signedIn',
            actions: assign(({ event }) => ({
              otpError: undefined,
              tokens: event.output.unwrapOr(undefined),
            })),
          },
          {
            target: 'otp',
            actions: assign(({ event }) => ({
              otpError: event.output.match(
                () => undefined,
                (error) => error,
              ),
            })),
          },
        ],
        onError: { target: 'otp', actions: assign({ otpError: { kind: 'unknown' } }) },
      },
    },
    signedIn: {
      type: 'final',
    },
  },
});
