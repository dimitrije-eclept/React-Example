import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, QueryErrorAlert, Skeleton } from '@shared/ui';
import { useAccounts } from '../queries/accounts';
import type { Account } from '../domain/account';
import { AccountCard } from './AccountCard';

const GRID = 'grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4';

function AccountCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3.5 p-5">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-9 w-44" />
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-1 h-4 w-40" />
    </Card>
  );
}

type AccountsSectionProps = {
  /** Link target of each card's "History" (the transactions feature owns that page). */
  readonly historyHref?: (account: Account) => string;
  /** Extra line per account, e.g. the card on a card account. */
  readonly noteFor?: (account: Account) => string | undefined;
};

/** "Accounts" on the overview: one card per account with available and booked balance. */
export function AccountsSection({ historyHref, noteFor }: AccountsSectionProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const { data: accounts, error, isPending, isFetching, refetch, dataUpdatedAt } = useAccounts();

  return (
    <section aria-labelledby={headingId} aria-busy={isPending} className="flex flex-col gap-3.5">
      <h2 id={headingId} className="text-[17px] font-semibold">
        {t('accounts.heading')}
      </h2>
      {error && (
        <QueryErrorAlert
          error={error}
          retrying={isFetching}
          onRetry={() => void refetch()}
          staleSince={accounts ? new Date(dataUpdatedAt) : undefined}
        />
      )}
      {isPending && !error && (
        <div className={GRID}>
          <span className="sr-only">{t('accounts.loading')}</span>
          <AccountCardSkeleton />
          <AccountCardSkeleton />
          <AccountCardSkeleton />
        </div>
      )}
      {accounts && accounts.length === 0 && <p className="text-muted">{t('accounts.empty')}</p>}
      {accounts && accounts.length > 0 && (
        <div className={GRID}>
          {accounts.map((account, index) => (
            <AccountCard
              index={index}
              key={account.number}
              account={account}
              historyHref={historyHref?.(account)}
              note={noteFor?.(account)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
