import { useTranslation } from 'react-i18next';
import { AccountsSection, useAccountName, useAccounts, type Account } from '@features/accounts';
import { RecentActivity, transactionsHref } from '@features/transactions';
import { useProfile } from '@features/profile';
import { CardsPanel, useCardLabel, useCards } from '@features/cards';
import { PAYMENT_PATH } from '@features/payments';
import { TRANSFER_PATH } from '@features/transfers';
import { ButtonLink, intlLocale, SendIcon, TransferIcon } from '@shared/ui';

type DayPart = 'morning' | 'afternoon' | 'evening';

function dayPart(date: Date): DayPart {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  return hour < 18 ? 'afternoon' : 'evening';
}

/** Recent activity follows the everyday account: the first active current account. */
function primaryAccount(accounts: readonly Account[]): Account | undefined {
  return accounts.find((account) => account.kind === 'current' && !account.blocked) ?? accounts[0];
}

export function OverviewPage({ now = new Date() }: { readonly now?: Date }) {
  const { t, i18n } = useTranslation();
  const { data: profile } = useProfile();
  const { data: accounts } = useAccounts();
  const accountName = useAccountName();
  const primary = accounts && primaryAccount(accounts);
  const { data: cards } = useCards();
  const cardLabel = useCardLabel();
  // A card account is mostly known by its card ("Mastercard Credit ·· 4444").
  const cardOf = (account: Account) => {
    const card =
      account.kind === 'card' &&
      cards?.find((candidate) => candidate.linkedAccount === account.number);
    return card ? cardLabel(card) : undefined;
  };
  const greeting = t(`overview.greeting.${dayPart(now)}`);
  const today = new Intl.DateTimeFormat(intlLocale(i18n.language), { dateStyle: 'full' }).format(
    now,
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[13px] text-muted">{today}</p>
          <h1 className="text-[30px] font-semibold tracking-tight">
            {profile ? t('overview.greetingName', { greeting, name: profile.firstName }) : greeting}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <ButtonLink to={TRANSFER_PATH} variant="secondary">
            <TransferIcon />
            {t('overview.actions.transfer')}
          </ButtonLink>
          <ButtonLink to={PAYMENT_PATH}>
            <SendIcon />
            {t('overview.actions.newPayment')}
          </ButtonLink>
        </div>
      </div>
      <AccountsSection
        historyHref={(account) => transactionsHref(account.number)}
        noteFor={cardOf}
      />
      <div className="flex flex-wrap items-start gap-4">
        {primary && (
          <RecentActivity
            account={primary.number}
            accountName={accountName(primary)}
            className="min-w-0 flex-[2_1_480px]"
          />
        )}
        <CardsPanel className="min-w-0 flex-[1_1_300px]" />
      </div>
    </>
  );
}
