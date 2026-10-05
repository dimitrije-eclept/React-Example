import type { Brand } from '@shared/domain';

/** What the customer types on the first sign-in step. */
export type Credentials = {
  readonly username: string;
  readonly password: string;
};

/** Opaque handle that ties the code step to the credentials step. */
export type SignInTicket = Brand<string, 'SignInTicket'>;

/** The bank accepted the credentials and texted a one-time code. */
export type OtpChallenge = {
  readonly ticket: SignInTicket;
  /** Already masked by the bank, e.g. "+381 64 *** **67". */
  readonly maskedPhone: string;
};

/** Proof of a signed-in session. Kept in memory only (ADR security baseline). */
export type AuthTokens = {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresInMs: number;
};

/** Why the credentials step failed, in the customer's terms. */
export type CredentialsError =
  | { readonly kind: 'invalid_credentials' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'unknown' };

/** Why the one-time-code step failed. `locked` and `expired` end the attempt: start over. */
export type OtpError =
  | { readonly kind: 'wrong_code'; readonly attemptsLeft: number }
  | { readonly kind: 'locked' }
  | { readonly kind: 'expired' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'unknown' };
