import type { ReactNode } from 'react';
import { cx } from './cx';
import { AlertIcon, CheckIcon } from './icons';

export type AlertTone = 'error' | 'warning' | 'success';

type AlertProps = {
  readonly tone: AlertTone;
  readonly children: ReactNode;
  /** Replaces the tone's default icon. */
  readonly icon?: ReactNode;
  readonly className?: string;
};

const TONES: Readonly<Record<AlertTone, string>> = {
  error: 'border-danger-line bg-danger-soft text-danger-ink',
  warning: 'border-warning-line bg-warning-soft text-warning-ink',
  success: 'border-success-line bg-success-soft text-success-ink',
};

/** Inline message. Errors are announced immediately (`role="alert"`), the rest politely. */
export function Alert({ tone, children, icon, className }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'flex animate-enter items-start gap-3 rounded-[10px] border px-4 py-3 text-sm',
        TONES[tone],
        className,
      )}
    >
      {icon ?? (tone === 'success' ? <CheckIcon /> : <AlertIcon />)}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
