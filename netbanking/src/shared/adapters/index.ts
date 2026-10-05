// Public API of shared/adapters (helpers reused by several features' adapters).
export { networkError, toDomainError, type ResponseMeta } from './errors';
export { parsePayload } from './schema-drift';
export { currencySchema, parseSrAmount } from './money';
export { toValidationError } from './validation';
