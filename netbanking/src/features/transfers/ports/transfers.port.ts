import type { Result } from '@shared/domain';
import type { TransferError, TransferReceipt, TransferRequest } from '../domain/transfer';

export interface TransfersPort {
  /** Moves money between two of the customer's accounts, immediately. */
  transfer(request: TransferRequest): Promise<Result<TransferReceipt, TransferError>>;
}
