import { useEffect, useId, useMemo, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAccountName, type Account } from '@features/accounts';
import { assertNever, formatIban } from '@shared/domain';
import { Alert, Button, Card, formatAmount, OtpInput } from '@shared/ui';
import type { AuthorizeError, PaymentChallenge, PaymentOrder } from '../domain/payment';
import type { PurposeCode } from '../domain/purpose-codes';

const CODE_LENGTH = 6;

type PaymentConfirmProps = {
  readonly order: PaymentOrder;
  readonly payer?: Account;
  readonly challenge: PaymentChallenge;
  readonly pending: boolean;
  readonly error?: AuthorizeError;
  readonly onSubmitCode: (code: string) => void;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
};

/** Shows exactly what will be paid next to the code that authorises it. */
export function PaymentConfirm({
  order,
  payer,
  challenge,
  pending,
  error,
  onSubmitCode,
  onEdit,
  onCancel,
}: PaymentConfirmProps) {
  const { t } = useTranslation();
  const accountName = useAccountName();
  const reviewId = useId();
  const codeHeadingId = useId();
  const fieldErrorId = useId();
  const alertId = useId();

  const schema = useMemo(
    () =>
      z.object({
        code: z
          .string()
          .regex(
            new RegExp(`^\\d{${CODE_LENGTH}}$`),
            t('auth.otp.required', { length: CODE_LENGTH }),
          ),
      }),
    [t],
  );
  const { control, handleSubmit, resetField, setFocus } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    if (error?.kind === 'wrong_code') {
      resetField('code');
      setFocus('code');
    }
  }, [error, resetField, setFocus]);

  const errorMessage = (value: AuthorizeError): ReactNode => {
    switch (value.kind) {
      case 'wrong_code':
        return (
          <Trans
            i18nKey="payments.confirm.wrongCode"
            count={value.attemptsLeft}
            components={{ strong: <strong /> }}
          />
        );
      case 'not_found':
        return t('payments.confirm.notFound');
      case 'unavailable':
        return t('common.errors.unavailable');
      // Locked, missing funds and "already authorised" end this step; they never show here.
      case 'locked':
      case 'insufficient_funds':
      case 'not_awaiting_authorization':
      case 'unknown':
        return t('common.errors.unknown');
      default:
        return assertNever(value);
    }
  };

  const rows: { label: string; value: ReactNode; mono?: boolean }[] = [
    { label: t('payments.confirm.to'), value: order.recipientName },
    {
      label: t('payments.confirm.recipientAccount'),
      value: formatIban(order.recipientIban),
      mono: true,
    },
    {
      label: t('payments.confirm.from'),
      value: (
        <>
          {payer ? accountName(payer) : ''}{' '}
          <span className="font-mono text-[13px] text-muted">{order.from}</span>
        </>
      ),
    },
    {
      label: t('payments.confirm.purposeCode'),
      value: `${order.purposeCode} · ${t(`payments.purpose.${order.purposeCode as PurposeCode}`)}`,
    },
    ...(order.reference
      ? [{ label: t('payments.confirm.reference'), value: order.reference, mono: true }]
      : []),
    ...(order.description
      ? [{ label: t('payments.confirm.description'), value: order.description }]
      : []),
  ];

  return (
    <>
      <h1
        tabIndex={-1}
        data-step-heading
        className="text-[30px] font-semibold tracking-tight outline-none"
      >
        {t('payments.confirm.title')}
      </h1>

      <div className="flex flex-wrap items-start gap-5">
        <Card as="section" aria-labelledby={reviewId} className="min-w-0 flex-[3_1_420px] p-6">
          <h2 id={reviewId} className="mb-3.5 text-[17px] font-semibold">
            {t('payments.confirm.youArePaying')}
          </h2>
          <p className="mb-[18px] text-4xl font-semibold tracking-tight tabular-nums">
            {formatAmount(order.amount)} <span className="text-lg">{order.amount.currency}</span>
          </p>
          <dl className="m-0">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex justify-between gap-4 border-t border-hairline py-3"
              >
                <dt className="text-muted">{row.label}</dt>
                <dd
                  className={`m-0 min-w-0 text-right font-medium [overflow-wrap:anywhere] ${row.mono ? 'font-mono' : ''}`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          <Button variant="link" className="mt-1 text-[13px]" disabled={pending} onClick={onEdit}>
            {t('payments.confirm.edit')}
          </Button>
        </Card>

        <Card
          as="form"
          noValidate
          aria-labelledby={codeHeadingId}
          onSubmit={handleSubmit(({ code }) => onSubmitCode(code))}
          className="flex min-w-0 flex-[2_1_320px] flex-col gap-[18px] p-6"
        >
          <div className="flex flex-col gap-1.5">
            <h2 id={codeHeadingId} className="text-[17px] font-semibold">
              {t('payments.confirm.codeTitle')}
            </h2>
            <p className="text-muted">
              <Trans
                i18nKey="payments.confirm.codeSent"
                values={{ phone: challenge.maskedPhone }}
                components={{
                  phone: <span className="font-semibold whitespace-nowrap text-ink" />,
                }}
              />
            </p>
          </div>
          <Controller
            name="code"
            control={control}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-2">
                <OtpInput
                  ref={field.ref}
                  label={t('payments.confirm.codeLabel')}
                  digitLabel={(index, length) => t('auth.otp.digit', { index, length })}
                  length={CODE_LENGTH}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  autoFocus
                  disabled={pending}
                  invalid={fieldState.invalid || error?.kind === 'wrong_code'}
                  aria-describedby={
                    [fieldState.error && fieldErrorId, error && alertId]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                />
                {fieldState.error && (
                  <p id={fieldErrorId} className="text-[13px] font-medium text-danger-ink">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
          <p className="text-[13px] text-muted">{t('payments.confirm.attempts')}</p>
          {error && (
            <div id={alertId}>
              <Alert tone="error">{errorMessage(error)}</Alert>
            </div>
          )}
          <Button type="submit" fullWidth loading={pending}>
            {t('payments.confirm.submit')}
          </Button>
          <Button variant="secondary" fullWidth disabled={pending} onClick={onCancel}>
            {t('payments.confirm.cancel')}
          </Button>
        </Card>
      </div>
    </>
  );
}
