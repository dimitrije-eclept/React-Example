import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccountName, useAccounts, type Account } from '@features/accounts';
import { assertNever, type DomainError } from '@shared/domain';
import {
  Alert,
  Button,
  Card as Panel,
  Chip,
  formatMoney,
  LockIcon,
  QueryErrorAlert,
  Skeleton,
} from '@shared/ui';
import type { Card } from '../domain/card';
import { useCards, useSetCardBlocked } from '../queries/cards';
import { useCardLabel } from './card-label';
import { CardFace } from './CardFace';

function CardTile({
  card,
  account,
  busy,
  onToggle,
  index,
}: {
  readonly card: Card;
  readonly account?: Account;
  readonly busy: boolean;
  readonly onToggle: () => void;
  readonly index: number;
}) {
  const { t } = useTranslation();
  const label = useCardLabel();
  const accountName = useAccountName();
  const headingId = useId();

  const rows = [
    { label: t('cards.linkedAccount'), value: account ? accountName(account) : card.linkedAccount },
    ...(card.creditLimit
      ? [{ label: t('cards.creditLimit'), value: formatMoney(card.creditLimit) }]
      : []),
    ...(account
      ? [{ label: t('cards.available'), value: formatMoney(account.balance.available) }]
      : []),
  ];

  return (
    <Panel
      as="article"
      aria-labelledby={headingId}
      className="flex animate-enter flex-col gap-[18px] p-5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <CardFace card={card} />
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-[17px] font-semibold">
          {label(card)}
        </h2>
        <Chip tone={card.blocked ? 'negative' : 'positive'}>
          {t(card.blocked ? 'cards.blocked' : 'cards.active')}
        </Chip>
      </div>
      {card.blocked && <p className="-mt-2.5 text-[13px] text-muted">{t('cards.blockedNote')}</p>}
      <dl className="m-0">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex justify-between gap-4 border-t border-hairline py-[11px]"
          >
            <dt className="text-muted">{row.label}</dt>
            <dd className="m-0 text-right font-medium tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
      <Button variant="secondary" className="self-start" loading={busy} onClick={onToggle}>
        {!busy && <LockIcon />}
        {t(card.blocked ? 'cards.unblock' : 'cards.block')}
      </Button>
    </Panel>
  );
}

export function CardsPage() {
  const { t } = useTranslation();
  const label = useCardLabel();
  const cards = useCards();
  const accounts = useAccounts();
  const setBlocked = useSetCardBlocked();
  const [done, setDone] = useState<{ card: Card; blocked: boolean } | null>(null);

  const blockErrorMessage = (error: DomainError): string => {
    switch (error.kind) {
      case 'unavailable':
        return t('common.errors.unavailable');
      case 'not_found':
        return t('cards.notFound');
      case 'unauthenticated':
      case 'sca_required':
      case 'insufficient_funds':
      case 'validation':
      case 'unknown':
        return t('common.errors.unknown');
      default:
        return assertNever(error);
    }
  };

  const toggle = (card: Card) => {
    setDone(null);
    setBlocked.mutate(
      { id: card.id, blocked: !card.blocked },
      { onSuccess: () => setDone({ card, blocked: !card.blocked }) },
    );
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-[30px] font-semibold tracking-tight">{t('cards.title')}</h1>
        <p className="text-muted">{t('cards.intro')}</p>
      </div>

      {done && (
        <Alert tone="success">
          {t(done.blocked ? 'cards.blockedDone' : 'cards.unblockedDone', {
            card: label(done.card),
          })}
        </Alert>
      )}
      {setBlocked.error && <Alert tone="error">{blockErrorMessage(setBlocked.error)}</Alert>}
      {cards.error && (
        <QueryErrorAlert
          error={cards.error}
          retrying={cards.isFetching}
          onRetry={() => void cards.refetch()}
          staleSince={cards.data ? new Date(cards.dataUpdatedAt) : undefined}
        />
      )}

      {cards.isPending && !cards.error && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5" aria-busy="true">
          {[0, 1].map((index) => (
            <Panel key={index} className="flex flex-col gap-4 p-5">
              <Skeleton className="aspect-[1.586] max-w-[400px] rounded-[14px]" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-10 w-full" />
            </Panel>
          ))}
        </div>
      )}
      {cards.data?.length === 0 && <p className="text-muted">{t('cards.empty')}</p>}
      {cards.data && cards.data.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
          {cards.data.map((card, index) => (
            <CardTile
              index={index}
              key={card.id}
              card={card}
              account={accounts.data?.find((account) => account.number === card.linkedAccount)}
              busy={setBlocked.isPending && setBlocked.variables?.id === card.id}
              onToggle={() => toggle(card)}
            />
          ))}
        </div>
      )}
    </>
  );
}
