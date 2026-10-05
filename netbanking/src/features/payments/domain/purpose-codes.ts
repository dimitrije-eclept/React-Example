/**
 * Payment codes ("šifre plaćanja") offered in the form. The full NBS list is longer; these cover
 * what private customers pay. The first one is the default.
 */
export const PURPOSE_CODES = ['289', '221', '253', '254', '290'] as const;

export type PurposeCode = (typeof PURPOSE_CODES)[number];
