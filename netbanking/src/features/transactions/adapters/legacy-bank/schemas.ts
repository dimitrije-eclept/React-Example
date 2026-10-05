import { z } from 'zod';
import { currencySchema } from '@shared/adapters';

/** `GET /core/v1/txn/history` (MESS-30..37). */
export const txnPageSchema = z.object({
  items: z.array(
    z.object({
      txnRef: z.string(),
      // MESS-33: two date formats in one object.
      bookDate: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/),
      valDate: z.string().regex(/^\d{8}$/),
      // MESS-34: always positive, the sign is in `dc`.
      amt: z.string(),
      dc: z.enum(['D', 'C']),
      ccy: currencySchema,
      // MESS-36: always present, often null.
      partnerName: z.string().nullable(),
      partnerAcc: z.string().nullable(),
      purpose: z.string().nullable(),
      // MESS-35
      state: z.enum(['B', 'P']),
    }),
  ),
  page: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export type TxnPage = z.infer<typeof txnPageSchema>;
export type TxnItem = TxnPage['items'][number];
