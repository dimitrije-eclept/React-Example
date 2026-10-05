import { z } from 'zod';

/** `POST /pay/internal/exec` 200 success: no `status` field at all (MESS-40). */
export const transferOkSchema = z.object({
  ref: z.string().min(1),
  // MESS-45: the only ISO timestamp with an offset in the whole API.
  ts: z.iso.datetime({ offset: true }),
});

/** MESS-40: business errors come back with HTTP 200; ERR_CCY has no errMsg. */
export const businessErrorSchema = z.object({
  status: z.literal('ERROR'),
  errCode: z.string(),
  errMsg: z.string().nullish(),
});
