import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ClockIcon } from '@shared/ui';
import type { SessionEndReason } from '../session';

type SessionEndedScreenProps = {
  readonly reason: SessionEndReason;
  readonly onSignInAgain: () => void;
};

/** Replaces the app after an idle timeout or a session the bank no longer accepts. */
export function SessionEndedScreen({ reason, onSignInAgain }: SessionEndedScreenProps) {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section
        aria-labelledby={headingId}
        className="flex w-full max-w-[440px] animate-pop flex-col gap-3.5 rounded-xl border border-line bg-white p-6 shadow-dialog"
      >
        <ClockIcon className="size-7 text-brand" />
        <h1 id={headingId} className="text-[17px] font-semibold">
          {t('session.endedTitle')}
        </h1>
        <p className="text-muted">{t(reason === 'idle' ? 'session.idle' : 'session.expired')}</p>
        <Button autoFocus className="self-start" onClick={onSignInAgain}>
          {t('session.signInAgain')}
        </Button>
      </section>
    </main>
  );
}
