import { useEffect, useState } from 'react';
import { useMachine } from '@xstate/react';
import { Trans } from 'react-i18next';
import { fromPromise, type SnapshotFrom } from 'xstate';
import type { AuthTokens } from '../domain/sign-in';
import { signInMachine } from '../machines/sign-in.machine';
import { useAuthPort } from '../queries/auth-port';
import { SignInPage, type SignInViewState } from './SignInPage';

type SignInScreenProps = {
  /** Called once with the new session's tokens. */
  readonly onSignedIn: (tokens: AuthTokens) => void;
  /** Show the demo account (dev builds against the mock backend). */
  readonly showDemoHint?: boolean;
};

function toViewState(snapshot: SnapshotFrom<typeof signInMachine>): SignInViewState {
  const { challenge, credentialsError, otpError } = snapshot.context;
  if (challenge === undefined || snapshot.matches('credentials')) {
    return {
      step: 'credentials',
      pending: snapshot.matches('checkingCredentials'),
      error: credentialsError,
    };
  }
  return {
    step: 'otp',
    maskedPhone: challenge.maskedPhone,
    pending: !snapshot.matches('otp'),
    error: otpError,
  };
}

/** The sign-in page wired to the AuthPort through the sign-in machine. */
export function SignInScreen({ onSignedIn, showDemoHint = false }: SignInScreenProps) {
  const port = useAuthPort();
  const [machine] = useState(() =>
    signInMachine.provide({
      actors: {
        startSignIn: fromPromise(({ input }) => port.startSignIn(input)),
        confirmSignIn: fromPromise(({ input }) => port.confirmSignIn(input.challenge, input.code)),
      },
    }),
  );
  const [snapshot, send] = useMachine(machine);

  const tokens = snapshot.status === 'done' ? snapshot.output : undefined;
  useEffect(() => {
    if (tokens) onSignedIn(tokens);
  }, [tokens, onSignedIn]);

  return (
    <SignInPage
      state={toViewState(snapshot)}
      onSubmitCredentials={(credentials) => send({ type: 'SUBMIT_CREDENTIALS', credentials })}
      onSubmitOtp={(code) => send({ type: 'SUBMIT_OTP', code })}
      onRestart={() => send({ type: 'RESTART' })}
      hint={
        showDemoHint && (
          <Trans
            i18nKey="auth.credentials.demoHint"
            values={{ username: 'demo', password: 'demo123', code: '123456' }}
            components={{ code: <code className="font-mono text-ink" /> }}
          />
        )
      }
    />
  );
}
