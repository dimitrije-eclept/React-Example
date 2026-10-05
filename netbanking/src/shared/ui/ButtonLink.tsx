import { Link, type LinkProps } from 'react-router';
import { buttonClassName, type ButtonVariant } from './button-styles';
import { cx } from './cx';

type ButtonLinkProps = LinkProps & {
  readonly variant?: ButtonVariant;
  readonly fullWidth?: boolean;
};

/** Navigation that looks like a button ("Cancel", "New payment"). */
export function ButtonLink({
  variant = 'primary',
  fullWidth = false,
  className,
  ...rest
}: ButtonLinkProps) {
  // Page transition by default (styles/index.css); pass viewTransition={false} to opt out.
  return (
    <Link viewTransition className={cx(buttonClassName(variant, fullWidth), className)} {...rest} />
  );
}
