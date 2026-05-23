import { type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppPill — state in text colour and a hairline edge with a faint tint.
 *
 * Visual spec: design-system/projects/dipstick/preview/26-avatars-pills.html  (.pill)
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css
 *
 * There is no rainbow. ok = posted/balanced/on-shift, short = oxblood for
 * shortage/voided, watch = amber, info = ink-blue system notes, ink/paper for
 * roles and neutral tags.
 */
export type AppPillTone = 'default' | 'ok' | 'short' | 'watch' | 'info' | 'ink' | 'paper';

export interface AppPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: AppPillTone;
  /** Show a small leading dot in the current colour. */
  dot?: boolean;
  children: ReactNode;
}

const TONE_CLASSES: Record<AppPillTone, string> = {
  default: 'text-ink-secondary border-hair bg-transparent',
  ok: 'text-emerald border-emerald/40 bg-emerald/10',
  short: 'text-oxblood border-oxblood/35 bg-oxblood-bg',
  watch: 'text-amber border-amber/35 bg-amber-bg',
  info: 'text-infoblue border-infoblue/30 bg-infoblue-bg',
  ink: 'text-paper border-ink bg-ink',
  paper: 'text-ink-secondary border-sheet-edge bg-recessed',
};

export function AppPill({ tone = 'default', dot, className, children, ...rest }: AppPillProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full border px-2',
        'font-sans text-[11px] font-medium tracking-[0.01em]',
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {dot === true && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-85" aria-hidden="true" />}
      {children}
    </span>
  );
}
