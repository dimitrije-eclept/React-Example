import type { Http } from '@shared/api';
import { networkError, parsePayload, toDomainError } from '@shared/adapters';
import { err, ok, type DomainError } from '@shared/domain';
import type { AuthPort } from '../../ports/auth.port';
import type { CredentialsError, OtpError } from '../../domain/sign-in';
import { toAuthTokens, toOtpChallenge, toOtpError } from './mappers';
import { apiErrorSchema, loginResponseSchema, tokenResponseSchema } from './schemas';

/** Sign-in steps only distinguish "the bank is down" from everything else. */
function narrow(error: DomainError): { readonly kind: 'unavailable' | 'unknown' } {
  return { kind: error.kind === 'unavailable' ? 'unavailable' : 'unknown' };
}

export function createLegacyBankAuth(http: Http): AuthPort {
  return {
    async startSignIn({ username, password }) {
      const sent = await http.send({
        method: 'POST',
        path: '/auth/login',
        body: { username, password },
        authenticated: false,
      });
      if (sent.isErr()) return err<never, CredentialsError>(narrow(networkError()));
      const response = sent.value;

      if (response.status === 200) {
        return parsePayload(loginResponseSchema, response.body, 'POST /auth/login')
          .map(toOtpChallenge)
          .mapErr(narrow);
      }
      // MESS-15: wrong credentials are a 401 *with* a JSON body (AUTH_FAILED); 422 is an empty field.
      if (response.status === 401 || response.status === 422) {
        return err({ kind: 'invalid_credentials' });
      }
      return err(narrow(toDomainError(response)));
    },

    async confirmSignIn(challenge, code) {
      const sent = await http.send({
        method: 'POST',
        path: '/auth/otp',
        body: { ticket: challenge.ticket, otp: code },
        authenticated: false,
      });
      if (sent.isErr()) return err<never, OtpError>(narrow(networkError()));
      const response = sent.value;

      if (response.status === 200) {
        return parsePayload(tokenResponseSchema, response.body, 'POST /auth/otp')
          .map(toAuthTokens)
          .mapErr(narrow);
      }
      if (response.status === 403) {
        const body = apiErrorSchema.safeParse(response.body);
        return err(body.success ? toOtpError(body.data) : { kind: 'unknown' });
      }
      return err(narrow(toDomainError(response)));
    },

    async refresh(refreshToken) {
      const sent = await http.send({
        method: 'POST',
        path: '/auth/refresh',
        // MESS-19: snake_case body; the token rotates, so the old one is dead after this call.
        body: { refresh_token: refreshToken },
        authenticated: false,
      });
      if (sent.isErr()) return err(networkError());
      const response = sent.value;

      if (response.status === 200) {
        return parsePayload(tokenResponseSchema, response.body, 'POST /auth/refresh').map(
          toAuthTokens,
        );
      }
      // MESS-19: an OAuth-style 400 {error:"invalid_grant"} means the session is over.
      if (response.status === 400) return err({ kind: 'unauthenticated' });
      return err(toDomainError(response));
    },

    async signOut() {
      const sent = await http.send({ method: 'POST', path: '/auth/logout' });
      if (sent.isErr()) return err(networkError());
      // MESS-20: 204 on success; a 401 means the session was already gone, which is fine too.
      if (sent.value.status === 204 || sent.value.status === 401) return ok(undefined);
      return err(toDomainError(sent.value));
    },
  };
}
