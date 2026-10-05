import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'link';

const VARIANTS: Readonly<Record<ButtonVariant, string>> = {
  primary: 'min-h-11 px-5 border border-brand bg-brand text-white enabled:hover:bg-brand-hover',
  secondary: 'min-h-11 px-[18px] border border-control bg-white text-ink enabled:hover:bg-ground',
  link: 'min-h-11 px-0 text-brand underline-offset-4 hover:text-brand-hover enabled:hover:underline',
};

/** Classes of a button, also for links that look like buttons (`ButtonLink`). */
export function buttonClassName(variant: ButtonVariant, fullWidth = false): string {
  return cx(
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg text-[15px] leading-none font-semibold no-underline transition-[color,background-color,border-color,transform] duration-150',
    'active:translate-y-px disabled:active:translate-y-0',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    fullWidth && 'w-full',
  );
}
