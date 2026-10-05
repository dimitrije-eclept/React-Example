import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Chip, cx, formatSignedAmount } from '@shared/ui';
import type { Transaction } from '../domain/transaction';
import { useTransactionTitle } from './transaction-title';

export function TransactionAmount({ transaction }: { readonly transaction: Transaction }) {
  return (
    <span
      className={cx(
        'shrink-0 text-right font-semibold whitespace-nowrap tabular-nums md:w-[130px]',
        transaction.amount.minor > 0n && 'text-credit',
      )}
    >
      {formatSignedAmount(transaction.amount)}
    </span>
  );
}

export function PendingChip() {
  const { t } = useTranslation();
  return <Chip tone="pending">{t('transactions.pending')}</Chip>;
}

type TransactionRowProps = {
  readonly transaction: Transaction;
  /** Rendered as a definition list when the row is expanded. */
  readonly details: ReadonlyArray<{ readonly label: string; readonly value: ReactNode }>;
};

/** One line of history; activating it reveals reference, dates and counterparty account. */
export function TransactionRow({ transaction, details }: TransactionRowProps) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const { title, subtitle } = useTransactionTitle()(transaction);

  return (
    <li
      className={cx('border-t border-hairline transition-colors duration-200', open && 'bg-subtle')}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((value) => !value)}
        className={cx(
          'flex w-full cursor-pointer items-center gap-4 px-3.5 py-3 text-left md:px-5 md:py-3.5',
          'hover:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold break-words">{title}</span>
          {subtitle && <span className="block text-[13px] text-muted">{subtitle}</span>}
        </span>
        {transaction.status === 'pending' && <PendingChip />}
        <TransactionAmount transaction={transaction} />
      </button>
      {/* Height animates via grid rows 0fr → 1fr; closed details are inert and hidden from AT. */}
      <div
        id={detailsId}
        inert={!open}
        aria-hidden={!open}
        className={cx(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-6 gap-y-3 px-3.5 pt-1 pb-[18px] md:px-5">
            {details.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-[13px] text-muted">{label}</dt>
                <dd className="m-0">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </li>
  );
}
