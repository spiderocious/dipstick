import { type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppFigure — the readout family. When a number is the most important thing on
 * the screen, it is the loudest object: large, mono, tabular.
 *
 * Visual spec: design-system/projects/dipstick/preview/03-figures.html
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css  (.read :437-456)
 *
 * `unit` renders a small sans suffix (L, /L). Set `naira` to prefix ₦. `tone`
 * tints short (oxblood) or ok (emerald) — default is ink.
 */
export type AppFigureSize = 'sm' | 'md' | 'lg' | 'xl';
export type AppFigureTone = 'default' | 'ok' | 'short';

export interface AppFigureProps extends HTMLAttributes<HTMLSpanElement> {
  value: ReactNode;
  size?: AppFigureSize;
  tone?: AppFigureTone;
  /** Small sans unit shown after the value (e.g. L, /L). */
  unit?: string;
  /** Prefix the value with a ₦ symbol. */
  naira?: boolean;
}

const SIZE_CLASSES: Record<AppFigureSize, string> = {
  sm: 'text-[20px]',
  md: 'text-[28px]',
  lg: 'text-[40px]',
  xl: 'text-[56px]',
};

const TONE_CLASSES: Record<AppFigureTone, string> = {
  default: 'text-ink',
  ok: 'text-emerald',
  short: 'text-oxblood',
};

export function AppFigure({
  value,
  size = 'md',
  tone = 'default',
  unit,
  naira,
  className,
  ...rest
}: AppFigureProps) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline font-mono font-medium leading-[0.95] tabular-nums tracking-[-0.02em]',
        SIZE_CLASSES[size],
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {naira === true && <span className="font-sans" aria-hidden="true">₦</span>}
      {value}
      {unit !== undefined && (
        <span className="ml-1 font-sans text-[0.36em] font-medium tracking-[0.02em] text-ink-tertiary">
          {unit}
        </span>
      )}
    </span>
  );
}
