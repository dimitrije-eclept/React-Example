import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Card } from '../domain/card';

/** "Visa Debit ·· 1111" */
export function useCardLabel(): (card: Card) => string {
  const { t } = useTranslation();
  return useCallback(
    (card) =>
      t('cards.label', {
        network: t(`cards.network.${card.network}`),
        kind: t(`cards.kind.${card.kind}`),
        lastFour: card.lastFour,
      }),
    [t],
  );
}

/** "12/27" */
export function formatExpiry({ month, year }: Card['expires']): string {
  return `${String(month).padStart(2, '0')}/${String(year % 100).padStart(2, '0')}`;
}
