import type { ReactNode } from 'react';
import { cx } from './cx';

export type ChipTone = 'neutral' | 'pending' | 'positive' | 'negative' | 'muted';

const TONES: Readonly<Record<ChipTone, string>> = {
  neutral: 'bg-ground text-ink-soft',
  pending: 'bg-pending-soft text-pending-ink',
  positive: 'bg-positive-soft text-positive-ink',
  negative: 'bg-negative-soft text-negative-ink',
  muted: 'bg-muted-soft text-ink-soft',
};

type ChipProps = {
  readonly tone?: ChipTone;
  readonly children: ReactNode;
  readonly className?: string;
};

/** Small status pill: "Pending", "Active", "Current · RSD". */
export function Chip({ tone = 'neutral', children, className }: ChipProps) {
  return (
    <span
      className={cx(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-[9px] text-xs font-semibold whitespace-nowrap transition-colors duration-300',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
