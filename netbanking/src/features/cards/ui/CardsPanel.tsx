import { useId } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAccountName, useAccounts } from '@features/accounts';
import {
  Card as Panel,
  Chip,
  cx,
  formatMoney,
  QueryErrorAlert,
  Skeleton,
  textLinkClassName,
} from '@shared/ui';
import { useCards } from '../queries/cards';
import { formatExpiry, useCardLabel } from './card-label';
import { CardSwatch } from './CardFace';
import { CARDS_PATH } from './links';

/** "Cards" on the overview: every card with its state, and a link to manage them. */
export function CardsPanel({ className }: { readonly className?: string }) {
  const { t } = useTranslation();
  const headingId = useId();
  const label = useCardLabel();
  const accountName = useAccountName();
  const cards = useCards();
  const accounts = useAccounts();

  return (
    <Panel
      as="section"
      aria-labelledby={headingId}
      className={cx('flex flex-col gap-3.5 px-5 pt-[18px] pb-5', className)}
    >
      <div className="flex items-baseline justify-between">
        <h2 id={headingId} className="text-[17px] font-semibold">
          {t('cards.title')}
        </h2>
        <Link to={CARDS_PATH} viewTransition className={textLinkClassName()}>
          {t('cards.manage')}
        </Link>
      </div>
      {cards.error && (
        <QueryErrorAlert
          error={cards.error}
          retrying={cards.isFetching}
          onRetry={() => void cards.refetch()}
          staleSince={cards.data ? new Date(cards.dataUpdatedAt) : undefined}
        />
      )}
      {cards.isPending && !cards.error && <Skeleton className="h-9 w-full" />}
      {cards.data?.length === 0 && <p className="text-muted">{t('cards.empty')}</p>}
      {cards.data?.map((card) => {
        const account = accounts.data?.find((candidate) => candidate.number === card.linkedAccount);
        const detail = card.creditLimit
          ? t('cards.limitShort', { amount: formatMoney(card.creditLimit) })
          : account && accountName(account);
        return (
          <div key={card.id} className="flex items-center gap-3.5">
            <CardSwatch card={card} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{label(card)}</div>
              <div className="text-[13px] text-muted">
                {[t('cards.expires', { date: formatExpiry(card.expires) }), detail]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
            <Chip tone={card.blocked ? 'negative' : 'positive'}>
              {t(card.blocked ? 'cards.blocked' : 'cards.active')}
            </Chip>
          </div>
        );
      })}
    </Panel>
  );
}
