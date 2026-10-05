import type { ComponentPropsWithoutRef, ElementType } from 'react';
import { cx } from './cx';

type CardProps<T extends ElementType> = {
  readonly as?: T;
} & ComponentPropsWithoutRef<T>;

/** White surface with the hairline border used for every panel in the design. */
export function Card<T extends ElementType = 'div'>({ as, className, ...rest }: CardProps<T>) {
  const Component: ElementType = as ?? 'div';
  return (
    <Component className={cx('rounded-xl border border-line bg-white', className)} {...rest} />
  );
}
