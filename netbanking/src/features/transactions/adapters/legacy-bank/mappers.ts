import { parseSrAmount } from '@shared/adapters';
import { Result, type DomainError } from '@shared/domain';
import type { Direction, Transaction, TransactionPage } from '../../domain/transaction';
import type { TxnItem, TxnPage } from './schemas';

/** "14.09.2026" → "2026-09-14" */
export function fromDottedDate(text: string): string {
  const [day, month, year] = text.split('.');
  return `${year}-${month}-${day}`;
}

/** "2026-09-14" → "14.09.2026" (MESS-31: the only format the query accepts). */
export function toDottedDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}

/** "20260915" → "2026-09-15" */
export function fromCompactDate(text: string): string {
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

export const DC: Readonly<Record<Direction, 'C' | 'D'>> = { in: 'C', out: 'D' };

export function toTransaction(item: TxnItem): Result<Transaction, DomainError> {
  return parseSrAmount(item.amt, item.ccy).map((amount) => ({
    reference: item.txnRef,
    amount: item.dc === 'D' ? { ...amount, minor: -amount.minor } : amount,
    status: item.state === 'P' ? 'pending' : 'booked',
    bookedOn: fromDottedDate(item.bookDate),
    valueOn: fromCompactDate(item.valDate),
    counterpartyName: item.partnerName,
    counterpartyAccount: item.partnerAcc,
    description: item.purpose,
  }));
}

export function toTransactionPage(page: TxnPage): Result<TransactionPage, DomainError> {
  return Result.combine(page.items.map(toTransaction)).map((items) => ({
    items,
    page: page.page,
    pageCount: page.totalPages,
  }));
}
