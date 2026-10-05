import { useEffect, useId, useMemo, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { assertNever } from '@shared/domain';
import { Alert, Button, LockIcon, OtpInput } from '@shared/ui';
import type { OtpError } from '../domain/sign-in';
import { StepHeading } from './StepHeading';

const OTP_LENGTH = 6;

type OtpFormProps = {
  /** Where the code was sent, already masked by the bank, e.g. "+381 64 *** **67". */
  readonly maskedPhone: string;
  readonly pending: boolean;
  readonly error?: OtpError;
  readonly onSubmit: (code: string) => void;
  /** Back to the credentials step (a new code is sent from there). */
  readonly onRestart: () => void;
};

export function OtpForm({ maskedPhone, pending, error, onSubmit, onRestart }: OtpFormProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const labelId = useId();
  const fieldErrorId = useId();
  const alertId = useId();
  const schema = useMemo(
    () =>
      z.object({
        code: z
          .string()
          .regex(
            new RegExp(`^\\d{${OTP_LENGTH}}$`),
            t('auth.otp.required', { length: OTP_LENGTH }),
          ),
      }),
    [t],
  );
  const { control, handleSubmit, resetField, setFocus } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  });

  // This attempt is over: the code can't be retried, only restarted.
  const ended = error?.kind === 'locked' || error?.kind === 'expired';

  // A rejected code is cleared: retype it (wrong code) or start over (locked, expired).
  // After "unavailable" the code is kept, so the same one can be sent again.
  useEffect(() => {
    if (error?.kind === 'wrong_code') {
      resetField('code');
      setFocus('code');
    } else if (ended) {
      resetField('code');
    }
  }, [error, ended, resetField, setFocus]);

  const errorMessage = (value: OtpError): ReactNode => {
    switch (value.kind) {
      case 'wrong_code':
        return (
          <Trans
            i18nKey="auth.otp.wrongCode"
            count={value.attemptsLeft}
            components={{ strong: <strong /> }}
          />
        );
      case 'locked':
        return <Trans i18nKey="auth.otp.locked" components={{ strong: <strong /> }} />;
      case 'expired':
        return t('auth.otp.expired');
      case 'unavailable':
        return t('common.errors.unavailable');
      case 'unknown':
        return t('common.errors.unknown');
      default:
        return assertNever(value);
    }
  };

  return (
    <form
      noValidate
      aria-labelledby={headingId}
      onSubmit={handleSubmit(({ code }) => onSubmit(code))}
      className="flex flex-col gap-5"
    >
      <StepHeading id={headingId} step={t('auth.otp.step')} title={t('auth.otp.title')}>
        <Trans
          i18nKey="auth.otp.sentTo"
          values={{ length: OTP_LENGTH, phone: maskedPhone }}
          components={{ phone: <span className="font-semibold whitespace-nowrap text-ink" /> }}
        />
      </StepHeading>

      <Controller
        name="code"
        control={control}
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-2.5">
            <span id={labelId} className="text-[13px] font-semibold">
              {t('auth.otp.label')}
            </span>
            <OtpInput
              ref={field.ref}
              label={t('auth.otp.label')}
              aria-labelledby={labelId}
              digitLabel={(index, length) => t('auth.otp.digit', { index, length })}
              length={OTP_LENGTH}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              autoFocus
              disabled={ended || pending}
              invalid={fieldState.invalid || error?.kind === 'wrong_code'}
              aria-describedby={
                [fieldState.error && fieldErrorId, error && alertId].filter(Boolean).join(' ') ||
                undefined
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

      {error && (
        <div id={alertId}>
          <Alert tone="error" icon={ended ? <LockIcon /> : undefined}>
            {errorMessage(error)}
          </Alert>
        </div>
      )}

      {ended ? (
        <Button variant="primary" fullWidth onClick={onRestart}>
          {t('auth.otp.restart')}
        </Button>
      ) : (
        <>
          <Button type="submit" fullWidth loading={pending}>
            {t('auth.otp.submit')}
          </Button>
          <div className="flex justify-end">
            <Button variant="link" onClick={onRestart} disabled={pending} className="text-[13px]">
              {t('auth.otp.restart')}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
