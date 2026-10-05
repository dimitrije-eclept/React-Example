import { z } from 'zod';
import type { DomainError } from '@shared/domain';

/** 422 `{errors:[{fld,msg}]}` (MESS-9). Messages are Serbian (MESS-12): keep them for logs only. */
const validationErrorsSchema = z.object({
  errors: z.array(z.object({ fld: z.string(), msg: z.string() })),
});

export function toValidationError(body: unknown): DomainError {
  const parsed = validationErrorsSchema.safeParse(body);
  if (!parsed.success) return { kind: 'unknown', cause: 'HTTP 422' };
  return {
    kind: 'validation',
    fields: Object.fromEntries(parsed.data.errors.map(({ fld, msg }) => [fld, msg])),
  };
}
