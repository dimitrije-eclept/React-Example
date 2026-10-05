import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@shared/ui';

/** Two columns on desktop (brand aside + form), stacked on phones with a slim brand bar. */
export function SignInLayout({ children }: { readonly children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-screen md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="flex flex-col justify-between gap-8 bg-night px-4 py-5 text-night-text md:px-12 md:py-10">
        <BrandMark />
        <div className="hidden max-w-[420px] flex-col gap-4 md:flex">
          <p className="text-[34px] leading-[1.15] font-semibold tracking-tight text-white">
            {t('auth.layout.headline')}
          </p>
          <p className="text-night-muted">{t('auth.layout.sca')}</p>
        </div>
        <p className="hidden text-[13px] text-night-faint md:block">{t('auth.layout.idle')}</p>
      </aside>
      <main className="flex justify-center px-4 py-8 md:items-center md:px-6 md:py-10">
        <div className="w-full max-w-[380px]">{children}</div>
      </main>
    </div>
  );
}
