import { cx } from './cx';

/** Shared look of text inputs and selects. */
export const FIELD_CONTROL = cx(
  'min-h-11 w-full rounded-lg border border-field bg-white px-3.5 text-[15px] text-ink',
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
  'disabled:bg-ground aria-invalid:border-danger',
);
