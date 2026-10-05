import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { intlLocale } from '@shared/ui';

/** Local calendar date of an ISO date string ("2026-09-14"), at midnight. */
export function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
}

export function toIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function monthsBefore(iso: string, months: number): string {
  const date = fromIsoDate(iso);
  date.setMonth(date.getMonth() - months);
  return toIsoDate(date);
}

function daysBetween(earlier: Date, later: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / 86_400_000);
}

/** Date labels in the UI language: day headings, short dates, ranges. */
export function useDateLabels(today: string) {
  const { t, i18n } = useTranslation();
  const locale = intlLocale(i18n.language);

  return useMemo(() => {
    const now = fromIsoDate(today);
    const sameYear = (date: Date) => date.getFullYear() === now.getFullYear();
    const format = (date: Date, options: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, options).format(date);
    const dayMonth = (date: Date) =>
      format(date, {
        day: 'numeric',
        month: 'long',
        ...(sameYear(date) ? {} : { year: 'numeric' }),
      });

    return {
      /** "Today, 2 October", "Saturday, 27 September" */
      dayHeading(iso: string): string {
        const date = fromIsoDate(iso);
        const ago = daysBetween(date, now);
        if (ago === 0) return t('transactions.today', { date: dayMonth(date) });
        if (ago === 1) return t('transactions.yesterday', { date: dayMonth(date) });
        return format(date, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          ...(sameYear(date) ? {} : { year: 'numeric' }),
        });
      },
      /** "Today", "Yesterday", "27 Sep" */
      shortDay(iso: string): string {
        const date = fromIsoDate(iso);
        const ago = daysBetween(date, now);
        if (ago === 0) return t('transactions.todayShort');
        if (ago === 1) return t('transactions.yesterdayShort');
        return format(date, { day: 'numeric', month: 'short' });
      },
      /** "22 Sep 2026" */
      date(iso: string): string {
        return format(fromIsoDate(iso), { day: 'numeric', month: 'short', year: 'numeric' });
      },
      /** "2 Jul – 2 Oct 2026" */
      range(from: string, to: string): string {
        return new Intl.DateTimeFormat(locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).formatRange(fromIsoDate(from), fromIsoDate(to));
      },
    };
  }, [locale, t, today]);
}
