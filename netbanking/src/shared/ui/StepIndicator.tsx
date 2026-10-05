import { CheckIcon } from './icons';
import { cx } from './cx';

type StepIndicatorProps = {
  readonly label: string;
  readonly steps: readonly string[];
  /** 0-based index of the current step; earlier steps show as done. */
  readonly current: number;
};

/** "① Details — ② Confirm — ③ Status" above a multi-step flow. */
export function StepIndicator({ label, steps, current }: StepIndicatorProps) {
  return (
    <ol aria-label={label} className="m-0 flex list-none flex-wrap items-center gap-2.5 p-0">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={step}
            aria-current={active ? 'step' : undefined}
            className={cx(
              'flex items-center gap-2 text-[13px] font-semibold',
              active ? 'text-ink' : 'text-muted',
            )}
          >
            {index > 0 && <span aria-hidden="true" className="h-px w-7 bg-control" />}
            <span
              className={cx(
                'grid size-[26px] place-items-center rounded-full border text-xs',
                active && 'border-brand bg-brand text-white',
                done && 'border-positive-soft bg-positive-soft text-positive-ink',
                !active && !done && 'border-field',
              )}
            >
              {done ? <CheckIcon className="size-3.5" /> : index + 1}
            </span>
            {step}
          </li>
        );
      })}
    </ol>
  );
}
