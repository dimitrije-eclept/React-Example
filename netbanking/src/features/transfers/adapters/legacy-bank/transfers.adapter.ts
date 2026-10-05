import type { Http } from '@shared/api';
import { networkError, parsePayload, toDomainError, toValidationError } from '@shared/adapters';
import { err, toDecimalString } from '@shared/domain';
import type { TransferError } from '../../domain/transfer';
import type { TransfersPort } from '../../ports/transfers.port';
import { toTransferValidation } from './mappers';
import { businessErrorSchema, transferOkSchema } from './schemas';

function toBusinessError(errCode: string): TransferError {
  switch (errCode) {
    case 'ERR_FUNDS':
      return { kind: 'insufficient_funds' };
    case 'ERR_CCY':
      return { kind: 'currency_mismatch' };
    default:
      return { kind: 'unknown', cause: errCode };
  }
}

export function createLegacyBankTransfers(http: Http): TransfersPort {
  return {
    async transfer({ from, to, amount, description, idempotencyKey }) {
      const sent = await http.send({
        method: 'POST',
        path: '/pay/internal/exec',
        // MESS-42: required; MESS-43: a repeat returns the first response without booking again.
        headers: { 'Idempotency-Key': idempotencyKey },
        body: {
          srcAcc: from,
          dstAcc: to,
          // MESS-5, MESS-39: dot-decimal *string* here ("1500.50"), unlike responses and /pay/dom.
          amt: toDecimalString(amount),
          ccy: amount.currency,
          descr: description || null,
        },
      });
      // Includes a timeout: the bank may have booked it, so the caller treats it as unknown.
      if (sent.isErr()) return err(networkError());
      const response = sent.value;

      if (response.status === 200) {
        // MESS-40: tell the two 200 shapes apart by the presence of `status`.
        const business = businessErrorSchema.safeParse(response.body);
        if (business.success) return err(toBusinessError(business.data.errCode));
        return parsePayload(transferOkSchema, response.body, 'POST /pay/internal/exec').map(
          (receipt) => ({ reference: receipt.ref, executedAt: new Date(receipt.ts) }),
        );
      }
      if (response.status === 404) return err({ kind: 'not_found', resource: 'account' });
      // MESS-44: field names are the bank's (`dstAcc`, `amt`); the domain uses the request's.
      if (response.status === 422) {
        return err(toTransferValidation(toValidationError(response.body)));
      }
      // 400 IDEMPOTENCY_KEY_MISSING is a bug on our side, not something the customer can fix.
      return err(toDomainError(response));
    },
  };
}
