import type { Http } from '@shared/api';
import { networkError, parsePayload, toDomainError, toValidationError } from '@shared/adapters';
import { err, toDecimalString, type DomainError } from '@shared/domain';
import type { AuthorizeError, PaymentId } from '../../domain/payment';
import type { PaymentsPort } from '../../ports/payments.port';
import { ORDER_FIELDS, toPaymentStatus } from './mappers';
import {
  apiErrorSchema,
  businessErrorSchema,
  initResponseSchema,
  signResponseSchema,
  statusSchema,
} from './schemas';

const paymentPath = (id: PaymentId) => `/pay/dom/${encodeURIComponent(id)}`;

/** Renames the bank's field names in a validation error to the order's. */
function renameFields(error: DomainError): DomainError {
  if (error.kind !== 'validation') return error;
  return {
    kind: 'validation',
    fields: Object.fromEntries(
      Object.entries(error.fields).map(([field, message]) => [
        ORDER_FIELDS[field] ?? field,
        message,
      ]),
    ),
  };
}

function narrow(error: DomainError): AuthorizeError {
  return { kind: error.kind === 'unavailable' ? 'unavailable' : 'unknown' };
}

export function createLegacyBankPayments(http: Http): PaymentsPort {
  return {
    async preparePayment(order) {
      const sent = await http.send({
        method: 'POST',
        path: '/pay/dom/init',
        body: {
          debtorAcc: order.from,
          creditorIban: order.recipientIban,
          creditorName: order.recipientName,
          // MESS-5, MESS-46: a JSON *number* here. At most 13+2 digits (bank limit), which a
          // double represents exactly, so this conversion is lossless.
          amount: Number(toDecimalString(order.amount)),
          currency: order.amount.currency,
          purposeCode: order.purposeCode,
          reference: order.reference ?? null,
          description: order.description ?? null,
        },
      });
      if (sent.isErr()) return err(networkError());
      const response = sent.value;
      if (response.status === 200) {
        return parsePayload(initResponseSchema, response.body, 'POST /pay/dom/init').map(
          (init) => ({ paymentId: init.paymentRef as PaymentId, maskedPhone: init.maskedPhone }),
        );
      }
      if (response.status === 404) return err({ kind: 'not_found', resource: 'account' });
      if (response.status === 422) return err(renameFields(toValidationError(response.body)));
      return err(toDomainError(response));
    },

    async authorizePayment(id, code) {
      const sent = await http.send({
        method: 'POST',
        path: `${paymentPath(id)}/sign`,
        body: { otp: code },
      });
      if (sent.isErr()) return err(narrow(networkError()));
      const response = sent.value;

      if (response.status === 200) {
        // MESS-50: ERR_FUNDS arrives with HTTP 200 and rejects the payment.
        const business = businessErrorSchema.safeParse(response.body);
        if (business.success) {
          return err(
            business.data.errCode === 'ERR_FUNDS'
              ? { kind: 'insufficient_funds' }
              : { kind: 'unknown' },
          );
        }
        return parsePayload(signResponseSchema, response.body, 'POST /pay/dom/{ref}/sign')
          .map(() => undefined)
          .mapErr(narrow);
      }
      const apiError = apiErrorSchema.safeParse(response.body);
      const errorCode = apiError.success ? apiError.data.code : undefined;
      // MESS-49: same OTP rules as sign-in; the third wrong code cancels the payment.
      if (response.status === 403 && errorCode === 'OTP_INVALID') {
        const attemptsLeft = apiError.data?.attemptsLeft ?? 0;
        return err(attemptsLeft > 0 ? { kind: 'wrong_code', attemptsLeft } : { kind: 'locked' });
      }
      if (response.status === 403 && errorCode === 'OTP_LOCKED') return err({ kind: 'locked' });
      // MESS-51: signing anything but an INIT payment is a 409 PAY_STATE.
      if (response.status === 409) return err({ kind: 'not_awaiting_authorization' });
      if (response.status === 404) return err({ kind: 'not_found' });
      return err(narrow(toDomainError(response)));
    },

    async getPaymentStatus(id) {
      const sent = await http.send({ method: 'GET', path: `${paymentPath(id)}/stat` });
      if (sent.isErr()) return err(networkError());
      const response = sent.value;
      if (response.status === 404) return err({ kind: 'not_found', resource: 'payment' });
      if (response.status !== 200) return err(toDomainError(response));
      return parsePayload(statusSchema, response.body, 'GET /pay/dom/{ref}/stat').map(
        toPaymentStatus,
      );
    },
  };
}
