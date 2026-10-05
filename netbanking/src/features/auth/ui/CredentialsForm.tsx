import { useEffect, useId, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { assertNever } from '@shared/domain';
import { Alert, Button, TextField } from '@shared/ui';
import type { Credentials, CredentialsError } from '../domain/sign-in';
import { StepHeading } from './StepHeading';

type CredentialsFormProps = {
  readonly pending: boolean;
  readonly error?: CredentialsError;
  readonly onSubmit: (credentials: Credentials) => void;
};

export function CredentialsForm({ pending, error, onSubmit }: CredentialsFormProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const schema = useMemo(
    () =>
      z.object({
        username: z.string().trim().min(1, t('auth.credentials.usernameRequired')),
        password: z.string().min(1, t('auth.credentials.passwordRequired')),
      }),
    [t],
  );
  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  // Wrong credentials: keep the username, let the customer retype the password.
  useEffect(() => {
    if (error?.kind === 'invalid_credentials') {
      resetField('password');
      setFocus('password');
    }
  }, [error, resetField, setFocus]);

  const errorMessage = (value: CredentialsError): string => {
    switch (value.kind) {
      case 'invalid_credentials':
        return t('auth.credentials.invalid');
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
      onSubmit={handleSubmit((values) => onSubmit(values))}
      className="flex flex-col gap-5"
    >
      <StepHeading
        id={headingId}
        step={t('auth.credentials.step')}
        title={t('auth.credentials.title')}
      />
      {error && <Alert tone="error">{errorMessage(error)}</Alert>}
      <TextField
        label={t('auth.credentials.username')}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus
        error={errors.username?.message}
        {...register('username')}
      />
      <TextField
        label={t('auth.credentials.password')}
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" fullWidth loading={pending}>
        {t('auth.credentials.submit')}
      </Button>
      <p className="text-[13px] text-muted">{t('auth.credentials.next')}</p>
    </form>
  );
}
