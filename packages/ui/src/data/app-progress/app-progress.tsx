import { type HTMLAttributes } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppProgressBar / AppGauge — progress against a real target.
 *
 * Visual spec: design-system/projects/dipstick/preview/24-progress.html
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css
 *
 * A working measure: emerald when on pace, amber on watch, oxblood when behind.
 * The bar can show a thin ink pace-target marker. The gauge is a ring for
 * budget-style figures.
 */
export type AppProgressTone = 'ok' | 'watch' | 'short';

const FILL_CLASSES: Record<AppProgressTone, string> = {
  ok: 'bg-emerald',
  watch: 'bg-amber',
  short: 'bg-oxblood',
};

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export interface AppProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** 0–100. */
  value: number;
  tone?: AppProgressTone;
  /** Optional pace-target marker (0–100) shown as a thin ink line. */
  target?: number;
}

export function AppProgressBar({ value, tone = 'ok', target, className, ...rest }: AppProgressBarProps) {
  const pct = clampPct(value);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'relative h-3 overflow-hidden rounded-[2px] border border-sheet-edge bg-recessed',
        className,
      )}
      {...rest}
    >
      <div className={cn('absolute inset-y-0 left-0', FILL_CLASSES[tone])} style={{ width: `${pct}%` }} />
      {target !== undefined && (
        <div
          className="absolute -top-0.5 -bottom-0.5 w-px bg-ink"
          style={{ left: `${clampPct(target)}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export interface AppGaugeProps {
  /** 0–100. */
  value: number;
  tone?: AppProgressTone;
  size?: number;
  className?: string;
  'aria-label'?: string;
}

export function AppGauge({
  value,
  tone = 'ok',
  size = 92,
  className,
  'aria-label': ariaLabel,
}: AppGaugeProps) {
  const pct = clampPct(value);
  const stroke = 8;
  const r = (size - stroke * 2) / 2 + stroke / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);
  const strokeColor =
    tone === 'short' ? 'var(--oxblood)' : tone === 'watch' ? 'var(--amber)' : 'var(--emerald)';

  return (
    <span
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--recessed)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute font-mono text-[18px] tabular-nums" style={{ color: 'var(--ink)' }}>
        {pct}%
      </span>
    </span>
  );
}
