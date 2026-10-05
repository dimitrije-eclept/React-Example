import { z } from 'zod';

/** `POST /pay/dom/init` 200: Y/N string flags (MESS-47). */
export const initResponseSchema = z.object({
  paymentRef: z.string().min(1),
  scaRequired: z.enum(['Y', 'N']),
  scaMethod: z.string(),
  maskedPhone: z.string(),
});

/** `POST /pay/dom/{ref}/sign` 200 success (MESS-51). */
export const signResponseSchema = z.object({
  paymentRef: z.string(),
  state: z.literal('PEND'),
});

/** MESS-50: insufficient funds at signing is an HTTP 200 business error, without errMsg. */
export const businessErrorSchema = z.object({
  status: z.literal('ERROR'),
  errCode: z.string(),
  errMsg: z.string().nullish(),
});

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string().nullish(),
  attemptsLeft: z.number().int().nullish(),
});

/** `GET /pay/dom/{ref}/stat` (MESS-52). */
export const statusSchema = z.object({
  paymentRef: z.string(),
  state: z.enum(['INIT', 'PEND', 'EXEC', 'REJ', 'CANC']),
  stateDt: z.string().regex(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/),
});

export type StatusResponse = z.infer<typeof statusSchema>;
