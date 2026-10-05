import type { PortResult, Result } from '@shared/domain';
import type {
  AuthTokens,
  Credentials,
  CredentialsError,
  OtpChallenge,
  OtpError,
} from '../domain/sign-in';

/**
 * Sign-in is a two-step use case with its own error vocabulary (wrong code, locked…), so those
 * steps return feature errors instead of the shared `DomainError`.
 */
export interface AuthPort {
  /** Checks the credentials and sends a one-time code. */
  startSignIn(credentials: Credentials): Promise<Result<OtpChallenge, CredentialsError>>;
  /** Exchanges the code for a session. */
  confirmSignIn(challenge: OtpChallenge, code: string): Promise<Result<AuthTokens, OtpError>>;
  /** Renews the session. `unauthenticated` means it can't be renewed: sign in again. */
  refresh(refreshToken: string): PortResult<AuthTokens>;
  /** Ends the session on the bank's side (uses the current access token). */
  signOut(): PortResult<void>;
}
