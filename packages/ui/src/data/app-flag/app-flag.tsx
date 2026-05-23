import { type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppFlag — a tiny mono variance tag, used inline beside a number.
 *
 * Visual spec: design-system/projects/dipstick/preview/26-avatars-pills.html  (.flag)
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css  (.flag-* :377-390)
 *
 * ok = emerald outline (balanced), over = amber outline, short = oxblood solid.
 * Use beside a figure — never to colour an entire row.
 */
export type AppFlagTone = 'ok' | 'over' | 'short';

export interface AppFlagProps extends HTMLAttributes<HTMLSpanElement> {
  tone: AppFlagTone;
  children: ReactNode;
}

const TONE_CLASSES: Record<AppFlagTone, string> = {
  ok: 'text-emerald border border-emerald/40 bg-emerald/10',
  over: 'text-amber border border-amber/40 bg-amber-bg',
  short: 'text-sheet bg-oxblood border border-oxblood',
};

export function AppFlag({ tone, className, children, ...rest }: AppFlagProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-[2px] px-1.5 font-mono text-[10px] font-semibold leading-[14px] tabular-nums',
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
