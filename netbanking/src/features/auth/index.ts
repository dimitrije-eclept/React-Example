// Public API of the auth feature. Other features and app/ import only from here.
export type {
  AuthTokens,
  Credentials,
  CredentialsError,
  OtpChallenge,
  OtpError,
} from './domain/sign-in';
export type { AuthPort } from './ports/auth.port';
export { createLegacyBankAuth } from './adapters/legacy-bank/auth.adapter';
export { SignInPage, type SignInViewState } from './ui/SignInPage';
export { SignInScreen } from './ui/SignInScreen';
