import { useTranslation } from 'react-i18next';
import { cx } from '@shared/ui';
import type { Card } from '../domain/card';
import { formatExpiry } from './card-label';

const BACKGROUND = (card: Card) =>
  card.blocked ? 'bg-card-blocked' : card.kind === 'credit' ? 'bg-card-credit' : 'bg-card-debit';

/** The plastic, as a picture: decorative, the same facts are in the text next to it. */
export function CardFace({ card }: { readonly card: Card }) {
  const { t } = useTranslation();
  return (
    <div
      aria-hidden="true"
      className={cx(
        'flex aspect-[1.586] max-w-[400px] flex-col justify-between rounded-[14px] p-[22px] text-white transition-colors duration-300',
        BACKGROUND(card),
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">{t(`cards.kind.${card.kind}`)}</span>
        <span className="font-bold tracking-[0.04em]">
          {card.network === 'visa' ? 'VISA' : t(`cards.network.${card.network}`)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[17px] tracking-[0.08em]">
          •••• •••• •••• {card.lastFour}
        </span>
        <span className="text-[13px] text-card-face-muted">
          {t('cards.expires', { date: formatExpiry(card.expires) })}
        </span>
      </div>
    </div>
  );
}

/** Small swatch for lists (overview). */
export function CardSwatch({ card }: { readonly card: Card }) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        'h-9 w-14 shrink-0 rounded-md transition-colors duration-300',
        BACKGROUND(card),
      )}
    />
  );
}
