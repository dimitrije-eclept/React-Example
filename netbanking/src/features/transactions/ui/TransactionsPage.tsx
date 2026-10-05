import { useEffect, useId, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAccountName, useAccounts, type AccountNumber } from '@features/accounts';
import {
  Button,
  Card,
  ChevronLeftIcon,
  ChevronRightIcon,
  cx,
  formatAmount,
  ListIcon,
  QueryErrorAlert,
  SegmentedControl,
  SelectField,
  Skeleton,
  TextField,
} from '@shared/ui';
import type { Direction, Transaction, TransactionFilter } from '../domain/transaction';
import { useTransactions } from '../queries/transactions';
import { monthsBefore, toIsoDate, useDateLabels } from './dates';
import { TransactionRow } from './TransactionRow';
import { TRANSACTION_PARAMS } from './links';

type DirectionChoice = Direction | 'all';

const DEFAULT_MONTHS = 3;

function parseDirection(value: string | null): DirectionChoice {
  return value === 'in' || value === 'out' ? value : 'all';
}

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Consecutive items with the same booking date. The list is already newest first. */
function groupByDay(items: readonly Transaction[]) {
  const groups: { day: string; items: Transaction[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last?.day === item.bookedOn) last.items.push(item);
    else groups.push({ day: item.bookedOn, items: [item] });
  }
  return groups;
}

function RowsSkeleton() {
  return (
    <ul className="m-0 list-none p-0">
      {[0, 1, 2, 3, 4].map((row) => (
        <li key={row} className="flex items-center gap-4 border-t border-hairline px-5 py-4">
          <span className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-28" />
          </span>
          <Skeleton className="h-4 w-20" />
        </li>
      ))}
    </ul>
  );
}

export function TransactionsPage({ today = toIsoDate(new Date()) }: { readonly today?: string }) {
  const { t } = useTranslation();
  const listHeadingId = useId();
  const [params, setParams] = useSearchParams();
  const accounts = useAccounts();
  const accountName = useAccountName();
  const labels = useDateLabels(today);

  // An empty date parameter means "open-ended"; a missing one means the default range.
  const from = params.get(TRANSACTION_PARAMS.from) ?? monthsBefore(today, DEFAULT_MONTHS);
  const to = params.get(TRANSACTION_PARAMS.to) ?? today;
  const direction = parseDirection(params.get(TRANSACTION_PARAMS.direction));
  const page = parsePage(params.get(TRANSACTION_PARAMS.page));
  const accountNumber = (params.get(TRANSACTION_PARAMS.account) ?? accounts.data?.[0]?.number) as
    AccountNumber | undefined;
  const account = accounts.data?.find((candidate) => candidate.number === accountNumber);
  const rangeInvalid = from !== '' && to !== '' && from > to;

  const filter: TransactionFilter | undefined =
    accountNumber && !rangeInvalid
      ? {
          account: accountNumber,
          from: from || undefined,
          to: to || undefined,
          direction: direction === 'all' ? undefined : direction,
          page,
        }
      : undefined;
  const history = useTransactions(filter);
  const result = history.data;

  /** Any filter change starts again at page 1. */
  const update = (changes: Partial<Record<keyof typeof TRANSACTION_PARAMS, string | null>>) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (!('page' in changes)) next.delete(TRANSACTION_PARAMS.page);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: !('page' in changes) },
    );

  const pageCount = result?.pageCount ?? 0;
  // A page past the end (an old link, or fewer results since): go to the last page that exists.
  const pastEnd =
    !history.isPlaceholderData && result !== undefined && page > Math.max(pageCount, 1);
  useEffect(() => {
    if (!pastEnd) return;
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (pageCount > 1) next.set(TRANSACTION_PARAMS.page, String(pageCount));
        else next.delete(TRANSACTION_PARAMS.page);
        return next;
      },
      { replace: true },
    );
  }, [pastEnd, pageCount, setParams]);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-[30px] font-semibold tracking-tight">{t('transactions.title')}</h1>
        <p className="text-muted">{t('transactions.intro')}</p>
      </div>

      <Card
        as="form"
        onSubmit={(event: FormEvent) => event.preventDefault()}
        className="flex flex-wrap items-start gap-4 px-5 py-[18px]"
      >
        <SelectField
          label={t('transactions.filters.account')}
          className="flex-[2_1_260px]"
          value={accountNumber ?? ''}
          disabled={!accounts.data}
          onChange={(event) => update({ account: event.target.value })}
        >
          {accounts.data?.map((option) => (
            <option key={option.number} value={option.number}>
              {accountName(option)} · {option.number} · {option.currency}
            </option>
          ))}
        </SelectField>
        <TextField
          type="date"
          label={t('transactions.filters.from')}
          className="flex-[1_1_140px]"
          value={from}
          max={to || undefined}
          error={rangeInvalid ? t('transactions.filters.rangeInvalid') : undefined}
          onChange={(event) => update({ from: event.target.value })}
        />
        <TextField
          type="date"
          label={t('transactions.filters.to')}
          className="flex-[1_1_140px]"
          value={to}
          min={from || undefined}
          onChange={(event) => update({ to: event.target.value })}
        />
        <SegmentedControl<DirectionChoice>
          label={t('transactions.filters.direction')}
          className="flex-[1_1_260px]"
          value={direction}
          onChange={(value) => update({ direction: value === 'all' ? null : value })}
          options={[
            { value: 'all', label: t('transactions.filters.all') },
            { value: 'in', label: t('transactions.filters.in') },
            { value: 'out', label: t('transactions.filters.out') },
          ]}
        />
      </Card>

      {accounts.error && !accounts.data && (
        <QueryErrorAlert
          error={accounts.error}
          retrying={accounts.isFetching}
          onRetry={() => void accounts.refetch()}
        />
      )}

      <Card
        as="section"
        aria-labelledby={listHeadingId}
        aria-busy={history.isFetching}
        className="overflow-hidden"
      >
        <h2 id={listHeadingId} className="sr-only">
          {t('transactions.listLabel')}
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[13px] text-muted">
          <p>
            {from && to && labels.range(from, to)}
            {pageCount > 0 &&
              ` · ${t('transactions.pageOf', { page: result?.page, count: pageCount })}`}
          </p>
          {account && (
            <p className="tabular-nums">
              {t('transactions.balances', {
                available: formatAmount(account.balance.available),
                booked: formatAmount(account.balance.booked),
                currency: account.currency,
              })}
            </p>
          )}
        </div>

        {history.error && (
          <div className="border-t border-hairline p-4">
            <QueryErrorAlert
              error={history.error}
              retrying={history.isFetching}
              onRetry={() => void history.refetch()}
              staleSince={result ? new Date(history.dataUpdatedAt) : undefined}
            />
          </div>
        )}

        {((history.isPending && !history.error && !rangeInvalid) || pastEnd) && (
          <>
            <span className="sr-only">{t('transactions.loading')}</span>
            <RowsSkeleton />
          </>
        )}

        {result && result.items.length === 0 && !pastEnd && (
          <div className="flex flex-col items-center gap-2 border-t border-hairline px-5 py-7 text-center">
            <ListIcon className="size-7 text-muted" />
            <p className="font-semibold">
              {from && to
                ? t('transactions.empty.range', {
                    from: labels.date(from),
                    to: labels.date(to),
                  })
                : t('transactions.empty.any')}
            </p>
            <p className="text-[13px] text-muted">{t('transactions.empty.hint')}</p>
          </div>
        )}

        {result && result.items.length > 0 && (
          <div
            // Keyed by what is shown: a new page or filter fades in instead of popping.
            key={JSON.stringify(filter)}
            className={cx(
              'transition-opacity duration-200',
              history.isPlaceholderData ? 'opacity-60' : 'animate-enter',
            )}
          >
            {groupByDay(result.items).map((group) => (
              <section key={group.day} aria-label={labels.dayHeading(group.day)}>
                <h3 className="border-t border-hairline bg-band px-3.5 py-2.5 text-[13px] font-semibold text-ink-soft md:px-5">
                  {labels.dayHeading(group.day)}
                </h3>
                <ul className="m-0 list-none p-0">
                  {group.items.map((transaction) => (
                    <TransactionRow
                      key={transaction.reference}
                      transaction={transaction}
                      details={[
                        {
                          label: t('transactions.details.reference'),
                          value: <span className="font-mono">{transaction.reference}</span>,
                        },
                        {
                          label: t(
                            transaction.status === 'pending'
                              ? 'transactions.details.made'
                              : 'transactions.details.booked',
                          ),
                          value: labels.date(transaction.bookedOn),
                        },
                        {
                          label: t('transactions.details.valueDate'),
                          value: labels.date(transaction.valueOn),
                        },
                        ...(transaction.counterpartyAccount
                          ? [
                              {
                                label: t('transactions.details.counterpartyAccount'),
                                value: (
                                  <span className="font-mono break-all">
                                    {transaction.counterpartyAccount}
                                  </span>
                                ),
                              },
                            ]
                          : []),
                      ]}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {pageCount > 1 && result && !pastEnd && (
          <nav
            aria-label={t('transactions.pages')}
            className="flex items-center justify-between gap-3 border-t border-hairline px-5 py-4"
          >
            <Button
              variant="secondary"
              disabled={result.page <= 1}
              onClick={() => update({ page: String(result.page - 1) })}
            >
              <ChevronLeftIcon />
              {t('transactions.newer')}
            </Button>
            <span className="text-[13px] text-muted">
              {t('transactions.pageOfCapital', { page: result.page, count: pageCount })}
            </span>
            <Button
              variant="secondary"
              disabled={result.page >= pageCount}
              onClick={() => update({ page: String(result.page + 1) })}
            >
              {t('transactions.older')}
              <ChevronRightIcon />
            </Button>
          </nav>
        )}
      </Card>
    </>
  );
}
