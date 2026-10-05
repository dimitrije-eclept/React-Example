import type { DomainError } from '@shared/domain';
import type { TransferField } from '../../domain/transfer';

/** Domain field names for the bank's 422 `fld` values (MESS-3, MESS-44). */
const TRANSFER_FIELDS: Readonly<Record<string, TransferField>> = {
  srcAcc: 'from',
  dstAcc: 'to',
  amt: 'amount',
  ccy: 'amount',
  descr: 'description',
};

/** Renames the bank's field names in a validation error; unknown fields keep their name. */
export function toTransferValidation(error: DomainError): DomainError {
  if (error.kind !== 'validation') return error;
  return {
    kind: 'validation',
    fields: Object.fromEntries(
      Object.entries(error.fields).map(([field, message]) => [
        TRANSFER_FIELDS[field] ?? field,
        message,
      ]),
    ),
  };
}
