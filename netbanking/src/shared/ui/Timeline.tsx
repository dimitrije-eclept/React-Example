import type { ReactNode } from 'react';
import { CheckIcon, ClockIcon } from './icons';
import { cx } from './cx';

export type TimelineItem = {
  readonly title: string;
  readonly detail?: ReactNode;
  readonly state: 'done' | 'current' | 'next';
};

/** Vertical list of what happened and what comes next (payment status). */
export function Timeline({ items }: { readonly items: readonly TimelineItem[] }) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {items.map((item, index) => (
        <li
          key={item.title}
          className={cx('flex items-start gap-3.5', index < items.length - 1 && 'pb-5')}
        >
          <span
            aria-hidden="true"
            className={cx(
              'grid size-7 shrink-0 place-items-center rounded-full transition-colors duration-300',
              item.state === 'done' && 'bg-positive-soft text-positive-ink',
              item.state === 'current' &&
                'animate-pulse-ring border-2 border-pending-line bg-pending-soft text-pending-ink',
              item.state === 'next' && 'border border-dashed border-faint-line bg-white',
            )}
          >
            {item.state === 'done' && <CheckIcon className="size-4" />}
            {item.state === 'current' && <ClockIcon className="size-4" />}
          </span>
          <div>
            <p className={cx('font-semibold', item.state === 'next' && 'text-muted')}>
              {item.title}
            </p>
            {item.detail && <p className="text-[13px] text-muted">{item.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
