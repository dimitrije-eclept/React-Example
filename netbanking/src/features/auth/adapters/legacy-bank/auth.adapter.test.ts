import { describe, expect, it, vi } from 'vitest';
import { http as rest, HttpResponse } from 'msw';
import { createHttp } from '@shared/api';
import { server } from '@shared/test';
import type { OtpChallenge, SignInTicket } from '../../domain/sign-in';
import { createLegacyBankAuth } from './auth.adapter';

const BASE = 'http://bank.test';

const auth = createLegacyBankAuth(
  createHttp({
    baseUrl: BASE,
    auth: { getAccessToken: () => 'access', refresh: async () => false, onUnauthorized: vi.fn() },
  }),
);

const challenge: OtpChallenge = {
  ticket: 'ticket-1' as SignInTicket,
  maskedPhone: '+381 64 *** **67',
};

// Payloads recorded from the mock-backend.
const tokens = {
  access_token: 'a1',
  refresh_token: 'r1',
  expires_in: 300,
  token_type: 'bearer',
};

describe('legacy-bank auth adapter', () => {
  describe('startSignIn', () => {
    it('maps the login ticket (MESS-14, MESS-16)', async () => {
      server.use(
        rest.post(`${BASE}/auth/login`, () =>
          HttpResponse.json({
            loginTicket: 'ticket-1',
            otpRequired: true,
            otpChannel: 'SMS',
            maskedPhone: '+381 64 *** **67',
          }),
        ),
      );
      const result = await auth.startSignIn({ username: 'demo', password: 'demo123' });
      expect(result._unsafeUnwrap()).toEqual(challenge);
    });

    it('maps 401 AUTH_FAILED to invalid credentials (MESS-15)', async () => {
      server.use(
        rest.post(`${BASE}/auth/login`, () =>
          HttpResponse.json({ code: 'AUTH_FAILED', message: 'Neispravni podaci' }, { status: 401 }),
        ),
      );
      const result = await auth.startSignIn({ username: 'demo', password: 'nope' });
      expect(result._unsafeUnwrapErr()).toEqual({ kind: 'invalid_credentials' });
    });

    it('maps an HTML 503 to unavailable (MESS-13)', async () => {
      server.use(
        rest.post(`${BASE}/auth/login`, () => HttpResponse.html('<h1>x</h1>', { status: 503 })),
      );
      const result = await auth.startSignIn({ username: 'demo', password: 'demo123' });
      expect(result._unsafeUnwrapErr()).toEqual({ kind: 'unavailable' });
    });

    it('treats a drifted payload as unknown', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      server.use(
        rest.post(`${BASE}/auth/login`, () =>
          HttpResponse.json({
            loginTicket_v2: 't',
            otpRequired: true,
            otpChannel: 'SMS',
            maskedPhone: 'x',
          }),
        ),
      );
      const result = await auth.startSignIn({ username: 'demo', password: 'demo123' });
      expect(result._unsafeUnwrapErr()).toEqual({ kind: 'unknown' });
      expect(warn).toHaveBeenCalledWith('[schema-drift] POST /auth/login', [
        'loginTicket: invalid_type',
      ]);
      warn.mockRestore();
    });
  });

  describe('confirmSignIn', () => {
    it('sends `ticket` and maps the snake_case tokens (MESS-16, MESS-17)', async () => {
      let body: unknown;
      server.use(
        rest.post(`${BASE}/auth/otp`, async ({ request }) => {
          body = await request.json();
          return HttpResponse.json(tokens);
        }),
      );
      const result = await auth.confirmSignIn(challenge, '123456');
      expect(body).toEqual({ ticket: 'ticket-1', otp: '123456' });
      expect(result._unsafeUnwrap()).toEqual({
        accessToken: 'a1',
        refreshToken: 'r1',
        expiresInMs: 300_000,
      });
    });

    it.each([
      [
        { code: 'OTP_INVALID', attemptsLeft: 2 },
        { kind: 'wrong_code', attemptsLeft: 2 },
      ],
      [{ code: 'OTP_LOCKED' }, { kind: 'locked' }],
      [{ code: 'TICKET_INVALID' }, { kind: 'expired' }],
      [{ code: 'SOMETHING_NEW' }, { kind: 'unknown' }],
    ])('maps 403 %o (MESS-18)', async (payload, expected) => {
      server.use(rest.post(`${BASE}/auth/otp`, () => HttpResponse.json(payload, { status: 403 })));
      const result = await auth.confirmSignIn(challenge, '000000');
      expect(result._unsafeUnwrapErr()).toEqual(expected);
    });
  });

  describe('refresh', () => {
    it('rotates the tokens', async () => {
      let body: unknown;
      server.use(
        rest.post(`${BASE}/auth/refresh`, async ({ request }) => {
          body = await request.json();
          return HttpResponse.json(tokens);
        }),
      );
      const result = await auth.refresh('r0');
      expect(body).toEqual({ refresh_token: 'r0' });
      expect(result._unsafeUnwrap().accessToken).toBe('a1');
    });

    it('maps 400 invalid_grant to unauthenticated (MESS-19)', async () => {
      server.use(
        rest.post(`${BASE}/auth/refresh`, () =>
          HttpResponse.json({ error: 'invalid_grant' }, { status: 400 }),
        ),
      );
      const result = await auth.refresh('used');
      expect(result._unsafeUnwrapErr()).toEqual({ kind: 'unauthenticated' });
    });
  });

  describe('signOut', () => {
    it.each([204, 401])('succeeds on %i (MESS-20)', async (status) => {
      server.use(rest.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status })));
      expect((await auth.signOut()).isOk()).toBe(true);
    });
  });
});
