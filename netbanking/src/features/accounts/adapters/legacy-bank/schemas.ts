import { z } from 'zod';
import { currencySchema } from '@shared/adapters';
import { parseIban } from '@shared/domain';

/** `GET /core/v2/acc/list`: a bare array (MESS-22) with mixed naming (MESS-24) and codes (MESS-25). */
export const accountListSchema = z.array(
  z.object({
    acc_no: z.string().min(1),
    // Normalised and checked (mod-97) here, so the domain gets a real `Iban`.
    IBAN: z.string().transform((value, context) => {
      const iban = parseIban(value);
      if (iban === null) context.addIssue({ code: 'custom', message: 'invalid_iban' });
      return iban ?? z.NEVER;
    }),
    descr: z.string().nullable(),
    prodType: z.enum(['TR', 'ST', 'KK']),
    ccy: currencySchema,
    status: z.enum(['A', 'B']),
    // MESS-26: local date-time without zone and a meaningless time.
    openDt: z.string().regex(/^\d{4}-\d{2}-\d{2}T/),
  }),
);

/** `GET /core/v2/acc/{accNo}/bal`: other names for the same things (MESS-27), sr-RS amounts (MESS-28). */
export const balanceSchema = z.object({
  accountNumber: z.string(),
  availBal: z.string(),
  bookBal: z.string(),
  currency: currencySchema,
});

export type AccountListItem = z.infer<typeof accountListSchema>[number];
export type BalanceResponse = z.infer<typeof balanceSchema>;
