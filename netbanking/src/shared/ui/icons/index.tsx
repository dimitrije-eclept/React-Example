import type { SVGProps } from 'react';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

/** 24×24 stroke icons; decorative by default (pass `aria-label` and `aria-hidden={false}` otherwise). */
function StrokeIcon({ d, className, ...rest }: IconProps & { readonly d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ?? 'size-5 shrink-0'}
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <StrokeIcon
      d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
      {...props}
    />
  );
}

export function CheckIcon(props: IconProps) {
  return <StrokeIcon d="M20 6 9 17l-5-5" {...props} />;
}

export function LockIcon(props: IconProps) {
  return <StrokeIcon d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" {...props} />;
}

export function RetryIcon(props: IconProps) {
  return <StrokeIcon d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" {...props} />;
}

export function ClockIcon(props: IconProps) {
  return <StrokeIcon d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2" {...props} />;
}

export function HomeIcon(props: IconProps) {
  return (
    <StrokeIcon d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" {...props} />
  );
}

export function ListIcon(props: IconProps) {
  return <StrokeIcon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" {...props} />;
}

export function TransferIcon(props: IconProps) {
  return <StrokeIcon d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" {...props} />;
}

export function SendIcon(props: IconProps) {
  return <StrokeIcon d="M22 2 11 13M22 2l-7 20-4-9-9-4z" {...props} />;
}

export function CardIcon(props: IconProps) {
  return (
    <StrokeIcon
      d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM2 10h20M6 15h4"
      {...props}
    />
  );
}

export function UserIcon(props: IconProps) {
  return <StrokeIcon d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" {...props} />;
}

export function SignOutIcon(props: IconProps) {
  return (
    <StrokeIcon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" {...props} />
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return <StrokeIcon d="M15 18l-6-6 6-6" {...props} />;
}

export function ChevronRightIcon(props: IconProps) {
  return <StrokeIcon d="M9 18l6-6-6-6" {...props} />;
}

export function Spinner({ className, ...rest }: IconProps) {
  return (
    <StrokeIcon
      d="M21 12a9 9 0 1 1-9-9"
      className={className ?? 'size-4 shrink-0 animate-spin'}
      {...rest}
    />
  );
}
