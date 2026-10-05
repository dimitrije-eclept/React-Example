import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  intlLocale,
  QueryErrorAlert,
  SegmentedControl,
  SignOutIcon,
  Skeleton,
} from '@shared/ui';
import { useProfile } from '../queries/profile';
import { formatPhone, initials, maskPhone } from './format';

type Language = 'sr' | 'en';

type ProfilePageProps = {
  readonly onSignOut: () => void;
  readonly now?: Date;
};

function DetailsCard({
  title,
  rows,
}: {
  readonly title: string;
  readonly rows: readonly { readonly label: string; readonly value: string }[];
}) {
  const headingId = useId();
  return (
    <Card as="section" aria-labelledby={headingId} className="px-6 pt-[22px] pb-2.5">
      <h2 id={headingId} className="mb-2.5 text-[17px] font-semibold">
        {title}
      </h2>
      <dl className="m-0">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap justify-between gap-4 border-t border-hairline py-3.5"
          >
            <dt className="text-muted">{row.label}</dt>
            <dd className="m-0 font-medium [overflow-wrap:anywhere]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function ProfilePage({ onSignOut, now = new Date() }: ProfilePageProps) {
  const { t, i18n } = useTranslation();
  const profile = useProfile();
  const locale = intlLocale(i18n.language);
  const language: Language = i18n.language.startsWith('en') ? 'en' : 'sr';

  const signedIn = (date: Date) => {
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
      date,
    );
    return date.toDateString() === now.toDateString()
      ? t('profile.signedInToday', { time })
      : t('profile.signedInOn', {
          date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date),
          time,
        });
  };

  return (
    <>
      {profile.error && (
        <QueryErrorAlert
          error={profile.error}
          retrying={profile.isFetching}
          onRetry={() => void profile.refetch()}
          staleSince={profile.data ? new Date(profile.dataUpdatedAt) : undefined}
        />
      )}
      <div className="flex flex-wrap items-center gap-[18px]">
        <div
          aria-hidden="true"
          className="grid size-16 place-items-center rounded-full bg-night-active text-[22px] font-semibold text-white"
        >
          {profile.data && initials(profile.data.firstName, profile.data.lastName)}
        </div>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[30px] font-semibold tracking-tight">
            {profile.data ? (
              `${profile.data.firstName} ${profile.data.lastName}`
            ) : (
              <>
                <span className="sr-only">{t('profile.title')}</span>
                <Skeleton className="h-9 w-56" />
              </>
            )}
          </h1>
          {profile.data && <p className="text-muted">{signedIn(profile.data.signedInAt)}</p>}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-start gap-5">
        {profile.data && (
          <>
            <DetailsCard
              title={t('profile.contact')}
              rows={[
                { label: t('profile.email'), value: profile.data.email },
                { label: t('profile.phone'), value: formatPhone(profile.data.phone) },
              ]}
            />
            <DetailsCard
              title={t('profile.security')}
              rows={[
                { label: t('profile.signInMethod'), value: t('profile.signInMethodValue') },
                { label: t('profile.codesSentTo'), value: maskPhone(profile.data.phone) },
                { label: t('profile.autoSignOut'), value: t('profile.autoSignOutValue') },
              ]}
            />
          </>
        )}
        <Card as="section" className="flex flex-col gap-3.5 px-6 py-[22px]">
          <SegmentedControl<Language>
            label={t('profile.language')}
            className="max-w-[280px] [&>span]:text-[17px]"
            value={language}
            onChange={(value) => void i18n.changeLanguage(value)}
            options={[
              // Each language is named in itself, so it can be found whatever is shown now.
              { value: 'sr', label: 'Srpski' },
              { value: 'en', label: 'English' },
            ]}
          />
        </Card>
      </div>

      <Button variant="secondary" className="self-start" onClick={onSignOut}>
        <SignOutIcon />
        {t('shell.signOut')}
      </Button>
    </>
  );
}
