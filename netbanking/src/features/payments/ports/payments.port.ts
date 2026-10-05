import type { PortResult, Result } from '@shared/domain';
import type {
  AuthorizeError,
  PaymentChallenge,
  PaymentId,
  PaymentOrder,
  PaymentStatus,
  PrepareError,
} from '../domain/payment';

/** Domestic payments: prepare → authorise with an SMS code → follow the status. */
export interface PaymentsPort {
  /** Creates the payment and sends the authorisation code. Does not move money. */
  preparePayment(order: PaymentOrder): Promise<Result<PaymentChallenge, PrepareError>>;
  /** Authorises with the code; on success the payment is processing and funds are reserved. */
  authorizePayment(id: PaymentId, code: string): Promise<Result<void, AuthorizeError>>;
  getPaymentStatus(id: PaymentId): PortResult<PaymentStatus>;
}
