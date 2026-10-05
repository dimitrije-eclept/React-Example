import type { ReactNode } from 'react';
import type { Credentials, CredentialsError, OtpError } from '../domain/sign-in';
import { CredentialsForm } from './CredentialsForm';
import { OtpForm } from './OtpForm';
import { SignInLayout } from './SignInLayout';

/** Everything the page renders; the sign-in flow (machine) owns it. */
export type SignInViewState =
  | { readonly step: 'credentials'; readonly pending: boolean; readonly error?: CredentialsError }
  | {
      readonly step: 'otp';
      readonly maskedPhone: string;
      readonly pending: boolean;
      readonly error?: OtpError;
    };

type SignInPageProps = {
  readonly state: SignInViewState;
  readonly onSubmitCredentials: (credentials: Credentials) => void;
  readonly onSubmitOtp: (code: string) => void;
  readonly onRestart: () => void;
  /** Shown under the credentials form, e.g. demo credentials for the mock backend. */
  readonly hint?: ReactNode;
};

export function SignInPage({
  state,
  onSubmitCredentials,
  onSubmitOtp,
  onRestart,
  hint,
}: SignInPageProps) {
  return (
    <SignInLayout>
      {state.step === 'credentials' ? (
        <div key="credentials" className="flex animate-enter flex-col gap-5">
          <CredentialsForm
            pending={state.pending}
            error={state.error}
            onSubmit={onSubmitCredentials}
          />
          {hint && (
            <div className="rounded-lg border border-dashed border-field px-3.5 py-3 text-[13px] text-muted">
              {hint}
            </div>
          )}
        </div>
      ) : (
        <div key="otp" className="animate-enter">
          <OtpForm
            maskedPhone={state.maskedPhone}
            pending={state.pending}
            error={state.error}
            onSubmit={onSubmitOtp}
            onRestart={onRestart}
          />
        </div>
      )}
    </SignInLayout>
  );
}
