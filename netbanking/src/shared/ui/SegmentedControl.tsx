import { useId } from 'react';
import { cx } from './cx';

type Option<T extends string> = { readonly value: T; readonly label: string };

type SegmentedControlProps<T extends string> = {
  readonly label: string;
  readonly options: readonly Option<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly className?: string;
};

/** A row of toggle buttons where exactly one is pressed (direction filter, language). */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const labelId = useId();
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <span id={labelId} className="text-[13px] font-semibold">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex min-h-11 overflow-hidden rounded-lg border border-field"
      >
        {options.map((option) => {
          const pressed = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              onClick={() => onChange(option.value)}
              className={cx(
                'flex-1 cursor-pointer px-3.5 text-sm whitespace-nowrap transition-colors duration-150 [&+&]:border-l [&+&]:border-field',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                pressed ? 'bg-ink font-semibold text-white' : 'bg-white font-medium text-ink',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
