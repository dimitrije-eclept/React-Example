import { cx } from './cx';

/** Grey placeholder block while data loads. Decorative: announce loading elsewhere. */
export function Skeleton({ className }: { readonly className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx('block animate-pulse rounded-md bg-skeleton', className)}
    />
  );
}
