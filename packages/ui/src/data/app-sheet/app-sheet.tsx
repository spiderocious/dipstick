import { type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppSheet — the only "card" idiom. A paper sheet with a hairline edge.
 *
 * Visual spec: design-system/projects/dipstick/preview/27-cards.html
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css  (.sheet :180-189)
 *
 * Hairlines, not shadows. `deep` is a slightly recessed second sheet. Pair with
 * <SheetHead> for the recurring serif-title + mono-meta header row.
 */
export type AppSheetPad = 'none' | 'tight' | 'md' | 'lg';

export interface AppSheetProps extends HTMLAttributes<HTMLDivElement> {
  pad?: AppSheetPad;
  deep?: boolean;
  children: ReactNode;
}

const PAD_CLASSES: Record<AppSheetPad, string> = {
  none: '',
  tight: 'px-[18px] py-[14px]',
  md: 'px-6 py-5',
  lg: 'px-8 py-7',
};

export function AppSheet({ pad = 'md', deep, className, children, ...rest }: AppSheetProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-sheet-edge',
        deep === true ? 'bg-recessed' : 'bg-sheet',
        PAD_CLASSES[pad],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface SheetHeadProps {
  title: ReactNode;
  /** Mono caption pinned to the right (e.g. record id · status). */
  meta?: ReactNode;
  className?: string;
}

/** The serif-title + mono-meta header row that opens most scenes. */
export function SheetHead({ title, meta, className }: SheetHeadProps) {
  return (
    <div
      className={cn('mb-4 flex items-baseline gap-3 border-b border-hair pb-3.5', className)}
    >
      <span className="font-serif text-[18px] font-semibold tracking-[-0.015em] text-ink">{title}</span>
      {meta !== undefined && (
        <span className="ml-auto font-mono text-[11px] text-ink-tertiary">{meta}</span>
      )}
    </div>
  );
}
