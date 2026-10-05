import type { ReactNode } from 'react';

type StepHeadingProps = {
  readonly id: string;
  readonly step: string;
  readonly title: string;
  readonly children?: ReactNode;
};

export function StepHeading({ id, step, title, children }: StepHeadingProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[13px] font-semibold text-muted">{step}</p>
      <h1 id={id} className="text-[30px] font-semibold tracking-tight">
        {title}
      </h1>
      {children && <p className="text-muted">{children}</p>}
    </div>
  );
}
