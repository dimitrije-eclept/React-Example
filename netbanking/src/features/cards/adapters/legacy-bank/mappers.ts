import type { AccountNumber } from '@features/accounts';
import { parseSrAmount } from '@shared/adapters';
import { err, ok, type Currency, type DomainError, type Result } from '@shared/domain';
import { networkOf, type Card, type CardId } from '../../domain/card';
import type { CardItem } from './schemas';

export function toCard(
  item: CardItem,
  currencyOf: (account: string) => Currency | undefined,
): Result<Card, DomainError> {
  const [month, year] = item.expiry.split('/').map(Number);
  let creditLimit = null;
  if (item.limit !== null) {
    // MESS-55: the limit has no currency; it is the linked account's.
    const currency = currencyOf(item.linkedAcc);
    if (currency === undefined) return err({ kind: 'unknown', cause: 'limit_without_account' });
    const parsed = parseSrAmount(item.limit, currency);
    if (parsed.isErr()) return err(parsed.error);
    creditLimit = parsed.value;
  }
  return ok({
    id: item.pan as CardId,
    kind: item.type === 'CREDIT' ? 'credit' : 'debit',
    network: networkOf(item.pan),
    lastFour: item.pan.slice(-4),
    // MESS-55: "MM/yy".
    expires: { month: month!, year: 2000 + year! },
    linkedAccount: item.linkedAcc as AccountNumber,
    blocked: item.blocked === 'Y',
    creditLimit,
  });
}
