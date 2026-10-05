import type { z } from 'zod';
import { err, ok, type DomainError, type Result } from '@shared/domain';

/**
 * Validates a payload at the adapter boundary. A mismatch is logged as schema drift (paths and
 * issue codes only, never values, so no PII reaches the console) and becomes an `unknown` error.
 */
export function parsePayload<T>(
  schema: z.ZodType<T>,
  body: unknown,
  endpoint: string,
): Result<T, DomainError> {
  const parsed = schema.safeParse(body);
  if (parsed.success) return ok(parsed.data);
  console.warn(
    `[schema-drift] ${endpoint}`,
    parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.code}`),
  );
  return err({ kind: 'unknown', cause: 'schema_drift' });
}
