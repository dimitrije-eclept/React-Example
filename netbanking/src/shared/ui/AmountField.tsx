import { useId, type ComponentPropsWithRef } from 'react';
import { cx } from './cx';
import { FIELD_CONTROL } from './field-styles';

type AmountFieldProps = Omit<ComponentPropsWithRef<'input'>, 'id' | 'type' | 'inputMode'> & {
  readonly label: string;
  /** Shown inside the field on the right, e.g. "RSD". */
  readonly currency?: string;
  readonly hint?: string;
  readonly error?: string;
};

/** Large amount input with the currency inside it. Parse its text with `parseAmountInput`. */
export function AmountField({
  label,
  currency,
  hint,
  error,
  className,
  ...inputProps
}: AmountFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cx(FIELD_CONTROL, 'min-h-[52px] pr-16 text-xl font-semibold tabular-nums')}
          {...inputProps}
        />
        {currency && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-semibold text-muted"
          >
            {currency}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-[13px] font-medium text-danger-ink">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-[13px] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
