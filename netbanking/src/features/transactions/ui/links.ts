import type { AccountNumber } from '@features/accounts';

/** Where the app mounts the transactions page (app/routes.tsx uses this too). */
export const TRANSACTIONS_PATH = '/transactions';

/** URL search parameters, so links (overview "History") and the back button keep the filters. */
export const TRANSACTION_PARAMS = {
  account: 'account',
  from: 'from',
  to: 'to',
  direction: 'direction',
  page: 'page',
} as const;

/** The history of one account with the default filters. */
export function transactionsHref(account: AccountNumber): string {
  return `${TRANSACTIONS_PATH}?${new URLSearchParams({ [TRANSACTION_PARAMS.account]: account })}`;
}
