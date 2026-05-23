import { type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppToast / AppBanner / AppInlineAlert — momentary, page-level, and row-level
 * feedback.
 *
 * Visual spec: design-system/projects/dipstick/preview/41-feedback.html
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css
 *
 * Toasts are dark ink rectangles that announce a done action. Banners are
 * page-level sheets carrying state. Inline alerts live inside the row they
 * describe (a left-border accent).
 */

/* ---------- Toast ---------- */
export type AppToastTone = 'ok' | 'error' | 'delivered';

export interface AppToastProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AppToastTone;
  /** Short mono mark, e.g. POSTED, ADDED, FAILED. */
  mark: string;
  /** Undo affordance text (e.g. "UNDO · 6s"). */
  onUndo?: () => void;
  undoLabel?: string;
  children: ReactNode;
}

export function AppToast({ tone = 'ok', mark, onUndo, undoLabel = 'UNDO', className, children, ...rest }: AppToastProps) {
  const delivered = tone === 'delivered';
  return (
    <div
      role="status"
      className={cn(
        'inline-flex max-w-[480px] items-center gap-3 rounded px-4 py-3 font-sans text-[13px]',
        'shadow-[0_16px_48px_-24px_rgba(26,23,20,0.4)]',
        delivered ? 'bg-emerald-hover text-sheet' : 'bg-ink text-paper',
        className,
      )}
      {...rest}
    >
      <span
        className="font-mono font-semibold"
        style={{ color: tone === 'error' ? '#F5BAB3' : 'var(--emerald-200, #C7E4D2)' }}
      >
        {mark}
      </span>
      <span>{children}</span>
      {onUndo !== undefined && (
        <button
          type="button"
          onClick={onUndo}
          className="ml-3 cursor-pointer rounded-[2px] border px-2 py-0.5 font-mono text-[11px] tracking-[0.06em] text-paper"
          style={{ borderColor: 'rgba(255,255,255,0.25)' }}
        >
          {undoLabel}
        </button>
      )}
    </div>
  );
}

/* ---------- Banner ---------- */
export type AppBannerTone = 'ok' | 'watch' | 'short' | 'info' | 'ink';

export interface AppBannerProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AppBannerTone;
  /** Mono uppercase label, e.g. REORDER, SHORTAGE. */
  mark: string;
  /** Right-aligned action(s). */
  action?: ReactNode;
  children: ReactNode;
}

const BANNER_CLASSES: Record<AppBannerTone, string> = {
  ok: 'bg-emerald/10 border-emerald/40 text-emerald',
  watch: 'bg-amber-bg border-amber/40 text-amber',
  short: 'bg-oxblood-bg border-oxblood/35 text-oxblood',
  info: 'bg-infoblue-bg border-infoblue/30 text-infoblue',
  ink: 'bg-ink border-ink text-paper',
};

export function AppBanner({ tone = 'info', mark, action, className, children, ...rest }: AppBannerProps) {
  return (
    <div
      className={cn('flex items-center gap-3.5 rounded-card border px-5 py-4 font-sans', BANNER_CLASSES[tone], className)}
      {...rest}
    >
      <span className="flex-shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.16em]">
        {mark}
      </span>
      <span className={cn('font-serif text-[14px] leading-[1.45]', tone === 'ink' ? 'text-paper' : 'text-ink-secondary')}>
        {children}
      </span>
      {action !== undefined && <span className="ml-auto flex-shrink-0">{action}</span>}
    </div>
  );
}

/* ---------- Inline alert ---------- */
export type AppInlineAlertTone = 'short' | 'over' | 'info';

export interface AppInlineAlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AppInlineAlertTone;
  /** Mono mark, e.g. SHORT, OVER, INFO. */
  mark: string;
  /** Trailing actions. */
  action?: ReactNode;
  children: ReactNode;
}

const INLINE_BORDER: Record<AppInlineAlertTone, string> = {
  short: 'border-l-oxblood',
  over: 'border-l-amber',
  info: 'border-l-infoblue',
};

const INLINE_MARK: Record<AppInlineAlertTone, string> = {
  short: 'text-oxblood',
  over: 'text-amber',
  info: 'text-infoblue',
};

export function AppInlineAlert({ tone = 'short', mark, action, className, children, ...rest }: AppInlineAlertProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3.5 rounded-[2px] border border-sheet-edge border-l-[3px] bg-sheet px-4 py-3.5 font-sans text-[13px] text-ink',
        INLINE_BORDER[tone],
        className,
      )}
      {...rest}
    >
      <span className={cn('font-mono text-[11px] font-semibold uppercase tracking-[0.14em]', INLINE_MARK[tone])}>
        {mark}
      </span>
      <span>{children}</span>
      {action !== undefined && <span className="ml-auto flex flex-shrink-0 items-center gap-2">{action}</span>}
    </div>
  );
}
