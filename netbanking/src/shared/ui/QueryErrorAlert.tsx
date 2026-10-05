import { useTranslation } from 'react-i18next';
import type { DomainError } from '@shared/domain';
import { Alert } from './Alert';
import { Button } from './Button';
import { intlLocale } from './format';
import { RetryIcon } from './icons';

type QueryErrorAlertProps = {
  readonly error: DomainError;
  readonly onRetry: () => void;
  readonly retrying?: boolean;
  /** When older data is still on screen: when it was loaded. */
  readonly staleSince?: Date;
};

const time = (date: Date, language: string) =>
  new Intl.DateTimeFormat(intlLocale(language), { hour: '2-digit', minute: '2-digit' }).format(
    date,
  );

/**
 * Loading failed. An outage is a warning (it passes; data on screen stays, with its time);
 * anything else is an error. A 401 never shows here: the session screen takes over.
 */
export function QueryErrorAlert({
  error,
  onRetry,
  retrying = false,
  staleSince,
}: QueryErrorAlertProps) {
  const { t, i18n } = useTranslation();
  const unavailable = error.kind === 'unavailable';
  return (
    <Alert tone={unavailable ? 'warning' : 'error'} icon={unavailable ? <RetryIcon /> : undefined}>
      <div className="flex flex-col items-start gap-2">
        <span>
          <strong>{t(unavailable ? 'common.load.unavailable' : 'common.load.failed')}</strong>{' '}
          {staleSince
            ? t('common.load.staleSince', { time: time(staleSince, i18n.language) })
            : t('common.load.tryAgain')}
        </span>
        <Button variant="secondary" loading={retrying} onClick={onRetry}>
          {t('common.load.retry')}
        </Button>
      </div>
    </Alert>
  );
}
