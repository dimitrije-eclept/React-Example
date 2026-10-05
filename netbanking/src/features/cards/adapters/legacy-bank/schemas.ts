import { z } from 'zod';
import { currencySchema } from '@shared/adapters';

/** `POST /cards/getCards`: a read via POST (MESS-54), wrapped in `cardList` (MESS-55). */
export const cardListSchema = z.object({
  cardList: z.array(
    z.object({
      pan: z.string().regex(/^\d{4}\*+\d{4}$/),
      expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/),
      type: z.enum(['DEBIT', 'CREDIT']),
      linkedAcc: z.string(),
      blocked: z.enum(['Y', 'N']),
      // sr-RS string without a currency; null for debit cards.
      limit: z.string().nullable(),
    }),
  ),
});

/** The account list, only to learn the currency of a credit limit. */
export const accountCurrenciesSchema = z.array(
  z.object({ acc_no: z.string(), ccy: currencySchema }),
);

/** `POST /cards/block`: unknown card is still HTTP 200, `{result:"NOK"}` (MESS-56). */
export const blockResultSchema = z.object({ result: z.enum(['OK', 'NOK']) });

export type CardItem = z.infer<typeof cardListSchema>['cardList'][number];
