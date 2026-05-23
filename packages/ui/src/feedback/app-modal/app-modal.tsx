'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { IconClose } from '../../icons/index.js';
import { cn } from '../../utils/cn.js';

/**
 * AppModal — the overlay sheet. Portal to <body>, scrim, ink-bordered panel.
 *
 * Visual spec: design-system/projects/dipstick/preview/40-modals.html
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css
 *
 * Use for confirmations and forms. For the irreversible VOID action see
 * <AppVoidConfirmModal>. Escape and scrim-click close (unless `dismissible` is
 * false). Body scroll is locked while open.
 */
export interface AppModalProps {
  open: boolean;
  onClose: () => void;
  /** Mono overline, e.g. CONFIRM, NEW ENTRY. */
  eyebrow?: string;
  title: ReactNode;
  /** Optional serif subtitle under the title row. */
  subtitle?: ReactNode;
  children: ReactNode;
  /** Footer actions, right-aligned. */
  footer?: ReactNode;
  /** Max width in px. */
  maxWidth?: number;
  /** Escape / scrim-click close. Default true. */
  dismissible?: boolean;
  /** Show the header × button. Defaults to `dismissible`. */
  showCloseButton?: boolean;
}

export function AppModal({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 520,
  dismissible = true,
  showCloseButton,
}: AppModalProps) {
  const closeVisible = showCloseButton ?? dismissible;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-6"
      style={{ background: 'rgba(26,23,20,0.36)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="w-full overflow-hidden rounded border border-ink bg-sheet shadow-[0_32px_80px_-32px_rgba(26,23,20,0.45)] outline-none"
        style={{ maxWidth }}
      >
        <div className="flex items-baseline gap-2.5 border-b border-hair px-[26px] pb-3.5 pt-[22px]">
          {eyebrow !== undefined && (
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-tertiary">
              {eyebrow}
            </span>
          )}
          <div className="min-w-0">
            <div className="font-serif text-[22px] font-semibold leading-[1.1] tracking-[-0.018em] text-ink">
              {title}
            </div>
            {subtitle !== undefined && (
              <div className="mt-1 font-serif text-[14px] italic leading-[1.4] text-ink-tertiary">
                {subtitle}
              </div>
            )}
          </div>
          {closeVisible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="ml-auto cursor-pointer self-start border-0 bg-transparent p-0 text-ink-tertiary hover:text-ink"
            >
              <IconClose size={16} />
            </button>
          )}
        </div>

        <div className="px-[26px] pb-[22px] pt-[18px]">{children}</div>

        {footer !== undefined && (
          <div className="flex items-center justify-end gap-2.5 border-t border-hair bg-recessed px-[22px] pb-[18px] pt-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** A small key/value ledger block used inside modals. */
export interface ModalLedgerProps {
  rows: ReadonlyArray<{ readonly k: string; readonly v: ReactNode; readonly tone?: 'short' | 'ok' }>;
  className?: string;
}

export function ModalLedger({ rows, className }: ModalLedgerProps) {
  return (
    <div className={cn('my-2 rounded-[2px] border border-sheet-edge bg-recessed px-3.5 py-3', className)}>
      {rows.map((row) => (
        <div key={row.k} className="grid grid-cols-[1fr_auto] py-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">{row.k}</span>
          <span
            className={cn(
              'font-mono text-[13px] tabular-nums',
              row.tone === 'short' ? 'text-oxblood' : row.tone === 'ok' ? 'text-emerald' : 'text-ink',
            )}
          >
            {row.v}
          </span>
        </div>
      ))}
    </div>
  );
}
