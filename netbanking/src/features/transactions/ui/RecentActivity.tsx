import { useId } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { AccountNumber } from '@features/accounts';
import { Card, QueryErrorAlert, Skeleton, textLinkClassName } from '@shared/ui';
import { useTransactions } from '../queries/transactions';
import { toIsoDate, useDateLabels } from './dates';
import { transactionsHref } from './links';
import { PendingChip, TransactionAmount } from './TransactionRow';
import { useTransactionTitle } from './transaction-title';

type RecentActivityProps = {
  readonly account: AccountNumber;
  readonly accountName: string;
  readonly limit?: number;
  readonly today?: string;
  readonly className?: string;
};

/** The newest few transactions of one account, for the overview. */
export function RecentActivity({
  account,
  accountName,
  limit = 7,
  today = toIsoDate(new Date()),
  className,
}: RecentActivityProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const labels = useDateLabels(today);
  const titleOf = useTransactionTitle();
  const history = useTransactions({ account, page: 1 });
  const items = history.data?.items.slice(0, limit);

  return (
    <Card
      as="section"
      aria-labelledby={headingId}
      aria-busy={history.isFetching}
      className={className}
    >
      <div className="flex items-baseline justify-between gap-3 px-5 pt-[18px] pb-3">
        <h2 id={headingId} className="text-[17px] font-semibold">
          {t('transactions.recent.title')}{' '}
          <span className="text-[13px] font-normal text-muted">· {accountName}</span>
        </h2>
        <Link to={transactionsHref(account)} viewTransition className={textLinkClassName()}>
          {t('transactions.recent.all')}
        </Link>
      </div>
      {history.error && (
        <div className="px-5 pb-5">
          <QueryErrorAlert
            error={history.error}
            retrying={history.isFetching}
            onRetry={() => void history.refetch()}
            staleSince={history.data ? new Date(history.dataUpdatedAt) : undefined}
          />
        </div>
      )}
      {history.isPending && !history.error && (
        <ul className="m-0 list-none p-0" aria-label={t('transactions.loading')}>
          {[0, 1, 2].map((row) => (
            <li key={row} className="flex items-center gap-4 border-t border-hairline px-5 py-4">
              <span className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </span>
              <Skeleton className="h-4 w-16" />
            </li>
          ))}
        </ul>
      )}
      {items?.length === 0 && (
        <p className="border-t border-hairline px-5 py-4 text-muted">
          {t('transactions.recent.empty')}
        </p>
      )}
      {items && items.length > 0 && (
        <ul className="m-0 animate-enter list-none p-0">
          {items.map((transaction) => {
            const { title, subtitle } = titleOf(transaction);
            return (
              <li
                key={transaction.reference}
                className="flex items-center gap-4 border-t border-hairline px-3.5 py-3 md:px-5 md:py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold break-words">{title}</div>
                  <div className="text-[13px] text-muted">
                    {[labels.shortDay(transaction.bookedOn), subtitle].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {transaction.status === 'pending' && <PendingChip />}
                <TransactionAmount transaction={transaction} />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
