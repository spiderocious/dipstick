import { useId, useState, type ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppTooltip — a tiny ink rectangle for short clarifications on icons or labels.
 *
 * Visual spec: design-system/projects/dipstick/preview/28-tooltips.html
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css
 *
 * Hand-rolled (no dependency). Shows on hover and keyboard focus; an ink panel
 * with a small arrow. For richer person/pump reveals, pass JSX as `content`.
 */
export type AppTooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface AppTooltipProps {
  content: ReactNode;
  placement?: AppTooltipPlacement;
  /** Set false to render a wider sheet-style panel (hovercard) instead of the ink chip. */
  compact?: boolean;
  children: ReactNode;
  className?: string;
}

const PLACEMENT_CLASSES: Record<AppTooltipPlacement, string> = {
  top: 'bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2',
  bottom: 'top-[calc(100%+8px)] left-1/2 -translate-x-1/2',
  left: 'right-[calc(100%+8px)] top-1/2 -translate-y-1/2',
  right: 'left-[calc(100%+8px)] top-1/2 -translate-y-1/2',
};

const ARROW_CLASSES: Record<AppTooltipPlacement, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ink',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-ink',
  left: 'left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-ink',
  right: 'right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-ink',
};

export function AppTooltip({
  content,
  placement = 'top',
  compact = true,
  children,
  className,
}: AppTooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'absolute z-50 whitespace-nowrap',
            PLACEMENT_CLASSES[placement],
            compact
              ? 'rounded-[3px] bg-ink px-2.5 py-1.5 font-mono text-[11px] tracking-[0.04em] text-paper shadow-[0_6px_24px_-12px_rgba(0,0,0,0.4)]'
              : 'w-80 whitespace-normal rounded-[3px] border border-ink bg-sheet p-4 font-sans text-xs text-ink shadow-[0_12px_36px_-16px_rgba(26,23,20,0.35)]',
          )}
        >
          {content}
          {compact && <span className={cn('absolute h-0 w-0', ARROW_CLASSES[placement])} aria-hidden="true" />}
        </span>
      )}
    </span>
  );
}
