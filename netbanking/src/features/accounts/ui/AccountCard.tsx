import { useId } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Card, Chip, formatAmount, textLinkClassName } from '@shared/ui';
import { pendingAmount, type Account } from '../domain/account';
import { useAccountName } from './account-name';

type AccountCardProps = {
  readonly account: Account;
  /** Where "History" leads; no link when missing. */
  readonly historyHref?: string;
  /** Extra line from other features, e.g. the card on a card account. */
  readonly note?: string;
  /** Position in the list; staggers the entry animation. */
  readonly index?: number;
};

export function AccountCard({ account, historyHref, note, index = 0 }: AccountCardProps) {
  const { t } = useTranslation();
  const accountName = useAccountName();
  const headingId = useId();
  const { available, booked } = account.balance;
  const pending = pendingAmount(account.balance);

  return (
    <Card
      as="article"
      aria-labelledby={headingId}
      className="flex animate-enter flex-col gap-3.5 p-5"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="font-semibold">
          {accountName(account)}
        </h3>
        <Chip>
          {t(`accounts.kind.${account.kind}`)} · {account.currency}
        </Chip>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] text-muted">{t('accounts.available')}</span>
        <span className="text-[28px] font-semibold tracking-tight tabular-nums">
          {formatAmount(available)}{' '}
          <span className="text-[15px] font-medium">{account.currency}</span>
        </span>
      </div>
      <div className="flex min-h-6 flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-muted tabular-nums">
          {t('accounts.booked', { amount: formatAmount(booked) })}
        </span>
        {account.blocked ? (
          <Chip tone="negative">{t('accounts.blocked')}</Chip>
        ) : pending ? (
          <Chip tone="pending">{t('accounts.pending', { amount: formatAmount(pending) })}</Chip>
        ) : (
          note && <span className="text-[13px] text-muted">{note}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-hairline pt-3">
        <span className="font-mono text-[13px] text-muted">{account.number}</span>
        {historyHref && (
          <Link
            to={historyHref}
            viewTransition
            aria-label={t('accounts.historyOf', { name: accountName(account) })}
            className={textLinkClassName()}
          >
            {t('accounts.history')}
          </Link>
        )}
      </div>
    </Card>
  );
}
