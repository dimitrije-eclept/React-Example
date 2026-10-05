import { useId, type ComponentPropsWithRef } from 'react';
import { cx } from './cx';
import { FIELD_CONTROL } from './field-styles';

type SelectFieldProps = Omit<ComponentPropsWithRef<'select'>, 'id'> & {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
};

/** Labelled native select (works with react-hook-form's `register()`). */
export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  ...selectProps
}: SelectFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(FIELD_CONTROL, 'cursor-pointer')}
        {...selectProps}
      >
        {children}
      </select>
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
