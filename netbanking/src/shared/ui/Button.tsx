import type { ComponentPropsWithRef } from 'react';
import { buttonClassName, type ButtonVariant } from './button-styles';
import { cx } from './cx';
import { Spinner } from './icons';

type ButtonProps = ComponentPropsWithRef<'button'> & {
  readonly variant?: ButtonVariant;
  readonly fullWidth?: boolean;
  /** Disables the button and shows a spinner; the label stays for screen readers. */
  readonly loading?: boolean;
};

export function Button({
  variant = 'primary',
  fullWidth = false,
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(buttonClassName(variant, fullWidth), className)}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
