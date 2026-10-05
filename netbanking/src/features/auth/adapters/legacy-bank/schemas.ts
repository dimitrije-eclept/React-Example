import { z } from 'zod';

/** `POST /auth/login` 200. camelCase, and `otpRequired` is a real boolean (MESS-6, MESS-14). */
export const loginResponseSchema = z.object({
  loginTicket: z.string().min(1),
  otpRequired: z.boolean(),
  otpChannel: z.string(),
  maskedPhone: z.string(),
});

/** `POST /auth/otp` and `/auth/refresh` 200. snake_case, unlike the rest of /auth (MESS-17). */
export const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  token_type: z.string(),
});

/** `{code, message?, attemptsLeft?}`, one of the error shapes (MESS-9). */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string().nullish(),
  attemptsLeft: z.number().int().nullish(),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type TokenResponse = z.infer<typeof tokenResponseSchema>;
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
