import type { ComponentType, ReactNode } from 'react';
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BrandMark, cx, SignOutIcon } from '@shared/ui';

export type NavItem = {
  readonly to: string;
  readonly label: string;
  readonly icon: ComponentType<{ className?: string }>;
};

type AppShellProps = {
  readonly nav: readonly NavItem[];
  readonly onSignOut: () => void;
  /** Shown in the sidebar footer once the profile has loaded. */
  readonly userName?: string;
  readonly children: ReactNode;
};

/** Dark sidebar + content column; on phones the sidebar becomes a scrolling top bar. */
export function AppShell({ nav, onSignOut, userName, children }: AppShellProps) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <nav
        aria-label={t('shell.nav.label')}
        className={cx(
          'flex shrink-0 items-center gap-3 bg-night px-3 py-2.5 text-night-text',
          'md:sticky md:top-0 md:h-screen md:w-[232px] md:flex-col md:items-stretch md:gap-7 md:px-3.5 md:py-6',
        )}
      >
        <div className="md:px-2.5">
          <BrandMark />
        </div>
        {/* Phones: only the links scroll sideways; brand and sign-out stay in view. */}
        <ul className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto md:flex-none md:flex-col md:overflow-visible">
          {nav.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                viewTransition
                className={({ isActive }) =>
                  cx(
                    'flex min-h-11 items-center gap-3 rounded-lg px-3 whitespace-nowrap no-underline transition-colors duration-150',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint',
                    isActive
                      ? 'bg-night-active font-semibold text-white'
                      : 'text-night-muted hover:bg-night-hover hover:text-white',
                  )
                }
              >
                <Icon className="size-5 shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="shrink-0 md:mt-auto md:flex md:flex-col md:gap-2 md:border-t md:border-night-line md:px-3 md:pt-3.5 md:text-[13px] md:text-night-faint">
          {userName && <span className="hidden md:inline">{userName}</span>}
          <span className="hidden md:inline">{t('shell.idleNote')}</span>
          <button
            type="button"
            onClick={onSignOut}
            className={cx(
              'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 whitespace-nowrap text-night-text hover:text-white',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint',
              'md:min-h-0 md:px-0 md:underline md:underline-offset-4',
            )}
          >
            <SignOutIcon className="size-5 shrink-0 md:hidden" />
            <span className="sr-only md:not-sr-only">{t('shell.signOut')}</span>
          </button>
        </div>
      </nav>
      {/* Named for the page transition (see styles/index.css): only this area animates. */}
      <main className="flex w-full max-w-[1180px] min-w-0 flex-1 flex-col gap-7 [view-transition-name:page] px-4 pt-5 pb-10 md:px-10 md:pt-8 md:pb-14">
        {children}
      </main>
    </div>
  );
}
