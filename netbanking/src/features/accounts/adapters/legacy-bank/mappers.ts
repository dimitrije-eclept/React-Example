import { parseSrAmount } from '@shared/adapters';
import { Result, type DomainError } from '@shared/domain';
import type { Account, AccountKind, AccountNumber, Balance } from '../../domain/account';
import type { AccountListItem, BalanceResponse } from './schemas';

// MESS-25: product codes.
const KINDS: Readonly<Record<AccountListItem['prodType'], AccountKind>> = {
  TR: 'current',
  ST: 'savings',
  KK: 'card',
};

export function toBalance(response: BalanceResponse): Result<Balance, DomainError> {
  return Result.combine([
    parseSrAmount(response.availBal, response.currency),
    parseSrAmount(response.bookBal, response.currency),
  ]).map(([available, booked]) => ({ available, booked }));
}

export function toAccount(item: AccountListItem, balance: Balance): Account {
  return {
    number: item.acc_no as AccountNumber,
    iban: item.IBAN,
    name: item.descr,
    kind: KINDS[item.prodType],
    currency: item.ccy,
    blocked: item.status === 'B',
    openedOn: item.openDt.slice(0, 10),
    balance,
  };
}
