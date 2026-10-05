import { Navigate, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SignInScreen } from '@features/auth';
import { CARDS_PATH } from '@features/cards';
import { PROFILE_PATH, ProfilePage, useProfile } from '@features/profile';
import { PAYMENT_PATH } from '@features/payments';
import { TRANSACTIONS_PATH } from '@features/transactions';
import { TRANSFER_PATH } from '@features/transfers';
import { CardIcon, HomeIcon, ListIcon, SendIcon, TransferIcon, UserIcon } from '@shared/ui';
import { AppShell, type NavItem } from './layout/AppShell';
import { SessionEndedScreen } from './layout/SessionEndedScreen';
import { useSession } from './session-context';

export function SignInRoute() {
  const { state, signIn } = useSession();
  if (state.status === 'active') return <Navigate to="/" replace />;
  return <SignInScreen onSignedIn={signIn} showDemoHint={import.meta.env.DEV} />;
}

/** Everything behind sign-in. An ended session replaces the app until acknowledged. */
export function AuthenticatedLayout() {
  const { t } = useTranslation();
  const { state, signOut, acknowledgeEnd } = useSession();
  const { data: profile } = useProfile({ enabled: state.status === 'active' });

  if (state.status === 'ended') {
    return <SessionEndedScreen reason={state.reason} onSignInAgain={acknowledgeEnd} />;
  }
  if (state.status === 'signed-out') return <Navigate to="/sign-in" replace />;

  // Pages are added to the sidebar as their feature lands.
  const nav: NavItem[] = [
    { to: '/', label: t('shell.nav.overview'), icon: HomeIcon },
    { to: TRANSACTIONS_PATH, label: t('shell.nav.transactions'), icon: ListIcon },
    { to: TRANSFER_PATH, label: t('shell.nav.transfer'), icon: TransferIcon },
    { to: PAYMENT_PATH, label: t('shell.nav.pay'), icon: SendIcon },
    { to: CARDS_PATH, label: t('shell.nav.cards'), icon: CardIcon },
    { to: PROFILE_PATH, label: t('shell.nav.profile'), icon: UserIcon },
  ];
  return (
    <AppShell
      nav={nav}
      onSignOut={signOut}
      userName={profile && `${profile.firstName} ${profile.lastName}`}
    >
      <Outlet />
    </AppShell>
  );
}

export function ProfileRoute() {
  const { signOut } = useSession();
  return <ProfilePage onSignOut={signOut} />;
}
