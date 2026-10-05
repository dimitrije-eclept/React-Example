import { useId, type ComponentPropsWithRef } from 'react';
import { cx } from './cx';
import { FIELD_CONTROL } from './field-styles';

type TextFieldProps = Omit<ComponentPropsWithRef<'input'>, 'id'> & {
  readonly label: string;
  readonly hint?: string;
  /** Field-level validation message; marks the input invalid. */
  readonly error?: string;
};

/** Labelled text input. Spreads the rest onto `<input>`, so react-hook-form's `register()` works. */
export function TextField({ label, hint, error, className, ...inputProps }: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={FIELD_CONTROL}
        {...inputProps}
      />
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
