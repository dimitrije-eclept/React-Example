import type { AuthTokens, OtpChallenge, OtpError, SignInTicket } from '../../domain/sign-in';
import type { ApiErrorBody, LoginResponse, TokenResponse } from './schemas';

export function toOtpChallenge(response: LoginResponse): OtpChallenge {
  return {
    // MESS-16: returned as `loginTicket`, sent back as `ticket`.
    ticket: response.loginTicket as SignInTicket,
    maskedPhone: response.maskedPhone,
  };
}

export function toAuthTokens(response: TokenResponse): AuthTokens {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    // MESS-21: opaque tokens, the lifetime is only known from `expires_in` (seconds).
    expiresInMs: response.expires_in * 1000,
  };
}

/** MESS-18: wrong code is a 403 with `attemptsLeft`; the third failure locks; a dead ticket is TICKET_INVALID. */
export function toOtpError(body: ApiErrorBody): OtpError {
  switch (body.code) {
    case 'OTP_INVALID':
      return body.attemptsLeft != null && body.attemptsLeft > 0
        ? { kind: 'wrong_code', attemptsLeft: body.attemptsLeft }
        : { kind: 'locked' };
    case 'OTP_LOCKED':
      return { kind: 'locked' };
    case 'TICKET_INVALID':
      return { kind: 'expired' };
    default:
      return { kind: 'unknown' };
  }
}
