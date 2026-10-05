import {
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { cx } from './cx';

/** Lets a form library focus the input (react-hook-form's `field.ref`, `setFocus`). */
export type OtpInputHandle = { focus: () => void };

type OtpInputProps = {
  readonly ref?: Ref<OtpInputHandle>;
  /** Entered digits so far; always a contiguous prefix of length ≤ `length`. */
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Accessible name of the group, e.g. "One-time code". Ignored when `aria-labelledby` is set. */
  readonly label: string;
  /** Id of a visible label for the group; preferred over `label` when the form shows one. */
  readonly 'aria-labelledby'?: string;
  /** Accessible name of each box (default "Digit 2 of 6"). */
  readonly digitLabel?: (index: number, length: number) => string;
  readonly length?: number;
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  readonly autoFocus?: boolean;
  readonly onBlur?: () => void;
  readonly 'aria-describedby'?: string;
};

/**
 * One box per digit. Typing advances, Backspace goes back, and pasting or SMS autofill
 * (`autocomplete="one-time-code"`) spreads the code across the boxes.
 */
export function OtpInput({
  ref,
  value,
  onChange,
  label,
  digitLabel = (index, total) => `Digit ${index} of ${total}`,
  length = 6,
  invalid = false,
  disabled = false,
  autoFocus = false,
  onBlur,
  'aria-describedby': describedBy,
  'aria-labelledby': labelledBy,
}: OtpInputProps) {
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');

  const focusBox = (index: number) => {
    boxes.current[Math.max(0, Math.min(index, length - 1))]?.focus();
  };

  // Focus lands on the first empty box (or the last one when the code is complete).
  useImperativeHandle(ref, () => ({ focus: () => focusBox(value.length) }));

  // Moving focus right after onChange would run the contiguity check in onFocus against the
  // previous value, so edits record the target and focus moves once the new value has rendered.
  const focusAfterRender = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (focusAfterRender.current === null) return;
    const target = focusAfterRender.current;
    focusAfterRender.current = null;
    boxes.current[Math.max(0, Math.min(target, length - 1))]?.focus();
  });

  /** Writes `input`'s digits starting at `index` and moves focus past them. */
  const writeFrom = (index: number, input: string) => {
    const incoming = input.replace(/\D/g, '');
    if (incoming === '') return;
    const next = [...digits];
    let cursor = index;
    for (const digit of incoming) {
      if (cursor >= length) break;
      next[cursor] = digit;
      cursor += 1;
    }
    focusAfterRender.current = cursor;
    onChange(next.join(''));
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      // Clear this box if filled, otherwise the previous one.
      const target = digits[index] ? index : index - 1;
      if (target < 0) return;
      focusAfterRender.current = target;
      onChange(value.slice(0, target) + value.slice(target + 1));
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusBox(Math.min(index + 1, value.length));
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    writeFrom(index, event.clipboardData.getData('text'));
  };

  return (
    <div
      role="group"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="flex gap-2 max-[400px]:gap-1.5"
    >
      {digits.map((digit, index) => (
        <input
          // Boxes are positional and never reorder.
          key={index}
          ref={(element) => {
            boxes.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={digitLabel(index + 1, length)}
          aria-invalid={invalid || undefined}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          value={digit}
          onChange={(event) => writeFrom(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => {
            // Keep the code contiguous: never start typing past the first empty box.
            if (index > value.length) focusBox(value.length);
            else event.target.select();
          }}
          onBlur={onBlur}
          className={cx(
            // Shrinks only on very narrow screens; at 390 px wide every box stays ≥ 44 px.
            'h-14 w-12 min-w-0 shrink rounded-lg border border-field bg-white text-center font-mono text-[22px] font-semibold text-ink',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
            'disabled:bg-ground disabled:text-muted aria-invalid:border-danger',
            'max-[400px]:h-12',
          )}
        />
      ))}
    </div>
  );
}
