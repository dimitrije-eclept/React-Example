import { cx } from './cx';

/**
 * Small inline text link ("History", "All", "Manage"). The visible text stays compact, but an
 * invisible box around it makes the touch target at least 44 px tall without moving the layout.
 */
export function textLinkClassName(className?: string): string {
  return cx(
    "relative text-[13px] font-semibold text-brand no-underline after:absolute after:-inset-x-2 after:-inset-y-3.5 after:content-['']",
    'hover:text-brand-hover hover:underline hover:underline-offset-4',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
    className,
  );
}
