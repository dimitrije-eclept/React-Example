import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAccountName, useAccounts, type Account } from '@features/accounts';
import { assertNever, type Money } from '@shared/domain';
import {
  Alert,
  AmountField,
  Button,
  ButtonLink,
  Card,
  cx,
  formatAmount,
  formatMoney,
  intlLocale,
  parseAmountInput,
  QueryErrorAlert,
  SelectField,
  Skeleton,
  TextField,
} from '@shared/ui';
import {
  TRANSFER_DESCRIPTION_MAX,
  type TransferError,
  type TransferField,
  type TransferReceipt,
} from '../domain/transfer';
import { useTransfer } from '../queries/transfer';
import { isOutcomeUnknown, useIdempotencyKey } from './idempotency';

type FormValues = Record<TransferField, string>;

const FIELDS = ['from', 'to', 'amount', 'description'] as const satisfies readonly TransferField[];

/** The form fields a bank validation error points at (field names are the domain's). */
function rejectedFields(error: TransferError | null): TransferField[] {
  if (error?.kind !== 'validation') return [];
  return FIELDS.filter((field) => field in error.fields);
}

/** Why an account can't receive from the chosen source, or `null` when it can. */
function ineligibility(source: Account | undefined, target: Account) {
  if (target.blocked) return 'blocked' as const;
  if (source && target.currency !== source.currency) return 'currency' as const;
  return null;
}

function eligibleTargets(accounts: readonly Account[], source: Account | undefined) {
  return accounts.filter(
    (account) => account.number !== source?.number && ineligibility(source, account) === null,
  );
}

type Completed = {
  readonly receipt: TransferReceipt;
  readonly amount: Money;
  readonly to: Account;
};

export function TransferPage() {
  const accounts = useAccounts();
  const { t } = useTranslation();

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-[30px] font-semibold tracking-tight">{t('transfers.title')}</h1>
        <p className="text-muted">{t('transfers.intro')}</p>
      </div>
      {/* With older data on screen, the balances (and the "up to" check) may be out of date. */}
      {accounts.error && (
        <QueryErrorAlert
          error={accounts.error}
          retrying={accounts.isFetching}
          onRetry={() => void accounts.refetch()}
          staleSince={accounts.data ? new Date(accounts.dataUpdatedAt) : undefined}
        />
      )}
      {accounts.isPending && (
        <Card className="flex max-w-[640px] flex-col gap-5 p-6" aria-busy="true">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      )}
      {accounts.data && <TransferForm accounts={accounts.data} />}
    </>
  );
}

function TransferForm({ accounts }: { readonly accounts: readonly Account[] }) {
  const { t, i18n } = useTranslation();
  const accountName = useAccountName();
  const transfer = useTransfer();
  const idempotency = useIdempotencyKey();
  const [completed, setCompleted] = useState<Completed | null>(null);
  const formId = useId();
  const summaryId = useId();

  const sources = accounts.filter((account) => !account.blocked);
  const byNumber = useMemo(
    () => new Map(accounts.map((account) => [account.number as string, account])),
    [accounts],
  );

  const schema = useMemo(
    () =>
      z
        .object({
          from: z.string().min(1),
          to: z.string().min(1, t('transfers.errors.toRequired')),
          amount: z.string().trim().min(1, t('transfers.errors.amountRequired')),
          description: z
            .string()
            .max(
              TRANSFER_DESCRIPTION_MAX,
              t('transfers.errors.descriptionTooLong', { max: TRANSFER_DESCRIPTION_MAX }),
            ),
        })
        .superRefine((values, context) => {
          const source = byNumber.get(values.from);
          if (!source || values.amount.trim() === '') return;
          const amount = parseAmountInput(values.amount, source.currency);
          const issue = (message: string) =>
            context.addIssue({ code: 'custom', path: ['amount'], message });
          if (amount === null) issue(t('transfers.errors.amountFormat'));
          else if (amount.minor <= 0n) issue(t('transfers.errors.amountPositive'));
          else if (amount.minor > source.balance.available.minor) {
            issue(
              t('transfers.errors.amountTooHigh', {
                amount: formatMoney(source.balance.available),
              }),
            );
          }
        }),
    [byNumber, t],
  );

  const firstSource = sources[0];
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    resetField,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      from: firstSource?.number ?? '',
      to: eligibleTargets(accounts, firstSource)[0]?.number ?? '',
      amount: '',
      description: '',
    },
  });

  const values = useWatch({ control });
  const source = byNumber.get(values.from ?? '');
  const target = byNumber.get(values.to ?? '');
  const targets = accounts.filter((account) => account.number !== source?.number);
  const amount = source ? parseAmountInput(values.amount ?? '', source.currency) : null;
  const validAmount = amount && amount.minor > 0n ? amount : null;

  // A new source can make the chosen destination impossible (other currency): pick the first
  // one that works instead.
  useEffect(() => {
    const current = byNumber.get(getValues('to'));
    if (current && current.number !== source?.number && ineligibility(source, current) === null) {
      return;
    }
    setValue('to', eligibleTargets(accounts, source)[0]?.number ?? '');
  }, [accounts, byNumber, getValues, setValue, source]);

  // The bank's own validation lands on the matching field (its messages are Serbian, MESS-12).
  const bankRejected = rejectedFields(transfer.error);
  useEffect(() => {
    for (const field of rejectedFields(transfer.error)) {
      setError(field, { message: t('transfers.errors.rejected') });
    }
  }, [transfer.error, setError, t]);

  const onSubmit = handleSubmit((form) => {
    const from = byNumber.get(form.from);
    const to = byNumber.get(form.to);
    const money = from && parseAmountInput(form.amount, from.currency);
    if (!from || !to || !money) return;
    const description = form.description.trim() || undefined;
    const request = {
      from: from.number,
      to: to.number,
      amount: money,
      description,
    };
    const idempotencyKey = idempotency.keyFor(
      JSON.stringify({ ...request, amount: money.minor.toString() }),
    );
    setCompleted(null);
    transfer.mutate(
      { ...request, idempotencyKey },
      {
        onSuccess: (receipt) => {
          idempotency.settle();
          setCompleted({ receipt, amount: money, to });
          resetField('amount');
          resetField('description');
        },
        onError: (error) => {
          if (!isOutcomeUnknown(error)) idempotency.settle();
        },
      },
    );
  });

  const errorMessage = (error: TransferError): ReactNode => {
    switch (error.kind) {
      case 'insufficient_funds':
        return (
          <Trans
            i18nKey="transfers.errors.funds"
            values={{
              account: source ? accountName(source) : '',
              amount: source ? formatMoney(source.balance.available) : '',
            }}
            components={{ strong: <strong /> }}
          />
        );
      case 'currency_mismatch':
        return (
          <Trans
            i18nKey="transfers.errors.currency"
            values={{ currency: source?.currency ?? '' }}
            components={{ strong: <strong /> }}
          />
        );
      case 'not_found':
        return t('transfers.errors.notFound');
      case 'validation':
        return t('transfers.errors.validation');
      // The bank may have booked it; the same details reuse the idempotency key.
      case 'unavailable':
        return <Trans i18nKey="transfers.errors.unavailable" components={{ strong: <strong /> }} />;
      case 'unknown':
        return <Trans i18nKey="transfers.errors.unknown" components={{ strong: <strong /> }} />;
      case 'unauthenticated':
      case 'sca_required':
        return t('common.errors.unknown');
      default:
        return assertNever(error);
    }
  };

  const executedAt = (date: Date) =>
    new Intl.DateTimeFormat(intlLocale(i18n.language), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);

  return (
    <div className="flex flex-col gap-5">
      {completed && (
        <Alert tone="success">
          <div className="flex flex-col gap-1">
            <span>
              <Trans
                i18nKey="transfers.done"
                values={{
                  amount: formatMoney(completed.amount),
                  account: accountName(completed.to),
                }}
                components={{ strong: <strong /> }}
              />
            </span>
            <span className="text-[13px]">{executedAt(completed.receipt.executedAt)}</span>
          </div>
        </Alert>
      )}

      <div className="flex flex-wrap items-start gap-5">
        <Card
          as="form"
          id={formId}
          noValidate
          onSubmit={onSubmit}
          className="flex min-w-0 flex-[3_1_440px] flex-col gap-[22px] p-6"
        >
          <SelectField
            label={t('transfers.from')}
            error={errors.from?.message}
            {...register('from')}
          >
            {sources.map((account) => (
              <option key={account.number} value={account.number}>
                {t('transfers.sourceOption', {
                  name: accountName(account),
                  amount: formatMoney(account.balance.available),
                })}
              </option>
            ))}
          </SelectField>

          <fieldset
            className="m-0 flex flex-col gap-2.5 border-0 p-0"
            aria-describedby={errors.to ? `${formId}-to-error` : undefined}
          >
            <legend className="mb-1.5 p-0 text-[13px] font-semibold">{t('transfers.to')}</legend>
            {targets.map((account) => {
              const reason = ineligibility(source, account);
              const selected = values.to === account.number;
              return (
                <label
                  key={account.number}
                  className={cx(
                    'flex items-center gap-3.5 rounded-[10px] border transition-colors duration-150',
                    selected
                      ? 'border-2 border-brand bg-brand-soft px-[15px] py-[13px]'
                      : 'border-control px-4 py-3.5',
                    reason
                      ? 'cursor-not-allowed bg-band text-muted'
                      : 'cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
                  )}
                >
                  <input
                    type="radio"
                    value={account.number}
                    disabled={reason !== null}
                    className="m-0 size-[18px] shrink-0 accent-brand"
                    {...register('to')}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{accountName(account)}</span>
                    {reason === null ? (
                      <span className="font-mono text-[13px] text-muted">{account.number}</span>
                    ) : (
                      <span className="text-[13px]">
                        {reason === 'blocked'
                          ? t('transfers.blockedAccount')
                          : t('transfers.otherCurrency', {
                              currency: account.currency,
                              source: source?.currency,
                            })}
                      </span>
                    )}
                  </span>
                  <span className="text-[13px] whitespace-nowrap tabular-nums">
                    {formatMoney(account.balance.available)}
                  </span>
                </label>
              );
            })}
            {source && eligibleTargets(accounts, source).length === 0 && (
              <p className="text-[13px] text-muted">
                {t('transfers.noDestination', { currency: source.currency })}
              </p>
            )}
            {errors.to?.message && (
              <p id={`${formId}-to-error`} className="text-[13px] font-medium text-danger-ink">
                {errors.to.message}
              </p>
            )}
          </fieldset>

          <AmountField
            label={t('transfers.amount')}
            currency={source?.currency}
            placeholder="0,00"
            hint={
              source
                ? t('transfers.upTo', { amount: formatMoney(source.balance.available) })
                : undefined
            }
            error={errors.amount?.message}
            {...register('amount', {
              // Show what was understood: "15000" becomes "15.000,00".
              onBlur: (event: { target: { value: string } }) => {
                const parsed = source && parseAmountInput(event.target.value, source.currency);
                if (parsed) setValue('amount', formatAmount(parsed));
              },
            })}
          />

          <TextField
            label={t('transfers.description')}
            hint={t('transfers.optional')}
            maxLength={TRANSFER_DESCRIPTION_MAX}
            error={errors.description?.message}
            {...register('description')}
          />

          {/* Field-level rejections are shown on the fields; anything else here. */}
          {transfer.error && bankRejected.length === 0 && (
            <Alert tone="error">{errorMessage(transfer.error)}</Alert>
          )}

          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" loading={transfer.isPending} disabled={!target}>
              {validAmount
                ? t('transfers.submitAmount', { amount: formatMoney(validAmount) })
                : t('transfers.submit')}
            </Button>
            <ButtonLink to="/" variant="secondary">
              {t('transfers.cancel')}
            </ButtonLink>
          </div>
        </Card>

        <Card
          as="aside"
          id={summaryId}
          aria-labelledby={`${summaryId}-title`}
          className="flex min-w-0 flex-[2_1_280px] flex-col gap-[18px] p-6"
        >
          <h2 id={`${summaryId}-title`} className="text-[17px] font-semibold">
            {t('transfers.summary.title')}
          </h2>
          {[
            { label: t('transfers.from'), account: source },
            { label: t('transfers.to'), account: target },
          ].map(({ label, account }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-[13px] text-muted">{label}</span>
              <span className="font-semibold">{account ? accountName(account) : '—'}</span>
              {account && (
                <span className="font-mono text-[13px] text-muted">{account.number}</span>
              )}
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-3 border-t border-hairline pt-4">
            <span className="text-muted">{t('transfers.summary.amount')}</span>
            <span className="text-[22px] font-semibold tabular-nums">
              {validAmount ? formatMoney(validAmount) : '—'}
            </span>
          </div>
          <p className="text-[13px] text-muted">{t('transfers.summary.note')}</p>
        </Card>
      </div>
    </div>
  );
}
