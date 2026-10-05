import { useEffect, useId, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAccountName, type Account } from '@features/accounts';
import { assertNever, formatIban, parseIban } from '@shared/domain';
import {
  Alert,
  AmountField,
  Button,
  ButtonLink,
  Card,
  CheckIcon,
  formatAmount,
  formatMoney,
  parseAmountInput,
  SelectField,
  TextField,
} from '@shared/ui';
import { PAYMENT_LIMITS, type PaymentOrder, type PrepareError } from '../domain/payment';
import { PURPOSE_CODES } from '../domain/purpose-codes';

type FormValues = {
  from: string;
  recipientName: string;
  recipientIban: string;
  amount: string;
  purposeCode: string;
  reference: string;
  description: string;
};

const FIELDS = [
  'from',
  'recipientName',
  'recipientIban',
  'amount',
  'purposeCode',
  'reference',
  'description',
] as const satisfies readonly (keyof FormValues)[];

/** The form fields a bank validation error names (already in the order's field names). */
function bankFields(error: Extract<PrepareError, { kind: 'validation' }>) {
  return FIELDS.filter((field) => field in error.fields);
}

function toFormValues(order: PaymentOrder | undefined, firstAccount: string): FormValues {
  return {
    from: order?.from ?? firstAccount,
    recipientName: order?.recipientName ?? '',
    recipientIban: order ? formatIban(order.recipientIban) : '',
    amount: order ? formatAmount(order.amount) : '',
    purposeCode: order?.purposeCode ?? PURPOSE_CODES[0],
    reference: order?.reference ?? '',
    description: order?.description ?? '',
  };
}

type PaymentDetailsFormProps = {
  /** Every account; only active RSD accounts can pay domestically. */
  readonly accounts: readonly Account[];
  /** The order being edited after "Edit details". */
  readonly order?: PaymentOrder;
  readonly pending: boolean;
  readonly error?: PrepareError;
  readonly onReview: (order: PaymentOrder) => void;
  readonly cancelHref: string;
};

export function PaymentDetailsForm({
  accounts,
  order,
  pending,
  error,
  onReview,
  cancelHref,
}: PaymentDetailsFormProps) {
  const { t } = useTranslation();
  const accountName = useAccountName();
  const headingId = useId();
  const payers = useMemo(
    () => accounts.filter((account) => account.currency === 'RSD' && !account.blocked),
    [accounts],
  );
  const byNumber = useMemo(
    () => new Map(payers.map((account) => [account.number as string, account])),
    [payers],
  );

  const schema = useMemo(
    () =>
      z
        .object({
          from: z.string().min(1),
          recipientName: z
            .string()
            .trim()
            .min(1, t('payments.errors.nameRequired'))
            .max(
              PAYMENT_LIMITS.recipientName,
              t('payments.errors.tooLong', { max: PAYMENT_LIMITS.recipientName }),
            ),
          recipientIban: z
            .string()
            .trim()
            .min(1, t('payments.errors.ibanRequired'))
            .refine((value) => parseIban(value) !== null, t('payments.errors.ibanInvalid')),
          amount: z.string().trim().min(1, t('payments.errors.amountRequired')),
          purposeCode: z.string().regex(/^\d{3}$/),
          reference: z
            .string()
            .trim()
            .max(
              PAYMENT_LIMITS.reference,
              t('payments.errors.tooLong', { max: PAYMENT_LIMITS.reference }),
            ),
          description: z
            .string()
            .trim()
            .max(
              PAYMENT_LIMITS.description,
              t('payments.errors.tooLong', { max: PAYMENT_LIMITS.description }),
            ),
        })
        .superRefine((values, context) => {
          const payer = byNumber.get(values.from);
          if (!payer || values.amount.trim() === '') return;
          const amount = parseAmountInput(values.amount, 'RSD');
          const issue = (message: string) =>
            context.addIssue({ code: 'custom', path: ['amount'], message });
          if (amount === null) issue(t('payments.errors.amountFormat'));
          else if (amount.minor <= 0n) issue(t('payments.errors.amountPositive'));
          else if (amount.minor > payer.balance.available.minor) {
            issue(
              t('payments.errors.amountTooHigh', {
                amount: formatMoney(payer.balance.available),
              }),
            );
          }
        }),
    [byNumber, t],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(order, payers[0]?.number ?? ''),
  });

  // The bank's own validation (e.g. its IBAN check) lands on the matching field.
  useEffect(() => {
    if (error?.kind !== 'validation') return;
    for (const name of bankFields(error)) {
      setError(name, {
        message: t(
          name === 'recipientIban' ? 'payments.errors.ibanInvalid' : 'payments.errors.rejected',
        ),
      });
    }
  }, [error, setError, t]);

  const ibanText = useWatch({ control, name: 'recipientIban' });
  const ibanValid = parseIban(ibanText ?? '') !== null;

  const generalError = (value: PrepareError): string | null => {
    switch (value.kind) {
      // Shown on the fields; only a rejection no field can show needs a general message.
      case 'validation':
        return bankFields(value).length === 0 ? t('payments.errors.validation') : null;
      case 'not_found':
        return t('payments.errors.accountNotFound');
      case 'unavailable':
        return t('common.errors.unavailable');
      case 'unauthenticated':
      case 'sca_required':
      case 'insufficient_funds':
      case 'unknown':
        return t('common.errors.unknown');
      default:
        return assertNever(value);
    }
  };
  const general = error && generalError(error);

  const onSubmit = handleSubmit((values) => {
    const recipientIban = parseIban(values.recipientIban);
    const amount = parseAmountInput(values.amount, 'RSD');
    const payer = byNumber.get(values.from);
    if (!recipientIban || !amount || !payer) return;
    onReview({
      from: payer.number,
      recipientName: values.recipientName.trim(),
      recipientIban,
      amount,
      purposeCode: values.purposeCode,
      reference: values.reference.trim() || undefined,
      description: values.description.trim() || undefined,
    });
  });

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1
          id={headingId}
          tabIndex={-1}
          data-step-heading
          className="text-[30px] font-semibold tracking-tight outline-none"
        >
          {t('payments.details.title')}
        </h1>
        <p className="text-muted">{t('payments.details.intro')}</p>
      </div>

      <Card
        as="form"
        noValidate
        aria-labelledby={headingId}
        onSubmit={onSubmit}
        className="flex max-w-[760px] flex-col gap-[22px] p-6"
      >
        <SelectField
          label={t('payments.details.from')}
          hint={t('payments.details.fromHint')}
          error={errors.from?.message}
          {...register('from')}
        >
          {payers.map((account) => (
            <option key={account.number} value={account.number}>
              {t('payments.details.fromOption', {
                name: accountName(account),
                amount: formatMoney(account.balance.available),
              })}
            </option>
          ))}
        </SelectField>

        <div aria-hidden="true" className="h-px bg-hairline" />

        <TextField
          label={t('payments.details.recipientName')}
          autoComplete="off"
          maxLength={PAYMENT_LIMITS.recipientName}
          error={errors.recipientName?.message}
          {...register('recipientName')}
        />

        <div className="flex flex-col gap-1.5">
          <TextField
            label={t('payments.details.recipientIban')}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="RS35 1050 0812 3123 1231 73"
            className="[&_input]:font-mono [&_input]:tracking-[0.02em]"
            error={errors.recipientIban?.message}
            {...register('recipientIban', {
              onBlur: (event: { target: { value: string } }) => {
                const iban = parseIban(event.target.value);
                if (iban) setValue('recipientIban', formatIban(iban));
              },
            })}
          />
          {ibanValid && !errors.recipientIban && (
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-positive-ink">
              <CheckIcon className="size-4" />
              {t('payments.details.ibanValid')}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <AmountField
            label={t('payments.details.amount')}
            currency="RSD"
            placeholder="0,00"
            error={errors.amount?.message}
            {...register('amount', {
              onBlur: (event: { target: { value: string } }) => {
                const amount = parseAmountInput(event.target.value, 'RSD');
                if (amount) setValue('amount', formatAmount(amount));
              },
            })}
          />
          <SelectField
            label={t('payments.details.purposeCode')}
            error={errors.purposeCode?.message}
            {...register('purposeCode')}
          >
            {PURPOSE_CODES.map((code) => (
              <option key={code} value={code}>
                {code} · {t(`payments.purpose.${code}`)}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextField
            label={t('payments.details.reference')}
            hint={t('payments.details.optional')}
            maxLength={PAYMENT_LIMITS.reference}
            autoComplete="off"
            className="[&_input]:font-mono"
            error={errors.reference?.message}
            {...register('reference')}
          />
          <TextField
            label={t('payments.details.description')}
            hint={t('payments.details.optional')}
            maxLength={PAYMENT_LIMITS.description}
            error={errors.description?.message}
            {...register('description')}
          />
        </div>

        {payers.length === 0 && <Alert tone="warning">{t('payments.details.noPayer')}</Alert>}
        {general && <Alert tone="error">{general}</Alert>}

        <div className="flex flex-wrap gap-2.5 pt-1">
          <Button type="submit" loading={pending} disabled={payers.length === 0}>
            {t('payments.details.review')}
          </Button>
          <ButtonLink to={cancelHref} variant="secondary">
            {t('payments.cancel')}
          </ButtonLink>
        </div>
      </Card>
    </>
  );
}
