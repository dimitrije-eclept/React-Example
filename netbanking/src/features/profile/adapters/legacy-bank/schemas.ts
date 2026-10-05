import { z } from 'zod';

/** `GET /usr/profile`: wrapped in `USER` (MESS-57), PascalCase next to `eMail`/`lastLogin` (MESS-58). */
export const profileEnvelopeSchema = z.object({
  USER: z.object({
    FirstName: z.string(),
    LastName: z.string(),
    eMail: z.string(),
    // MESS-59: no spaces, unlike `maskedPhone` elsewhere.
    Phone: z.string(),
    // MESS-60: epoch *seconds* as a string.
    lastLogin: z.string().regex(/^\d+$/),
  }),
});

export type ProfileEnvelope = z.infer<typeof profileEnvelopeSchema>;
