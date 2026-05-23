'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { IconClose } from '../../icons/index.js';

/**
 * AppVoidConfirmModal — the CRITICAL idiom. The only place we use a hazard
 * stripe and a typed-word gate.
 *
 * Visual spec: design-system/projects/dipstick/preview/40-modals.html  (.modal.critical)
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css
 *
 * Reserve for irreversible actions with legal / financial weight (voiding a
 * posted shift). Requires an audited reason AND typing the literal word VOID.
 */
export interface AppVoidConfirmModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Explanatory body — the "this is irreversible" copy. */
  children: ReactNode;
  /** Called with the typed reason once confirmed. */
  onConfirm: (reason: string) => void;
  /** The literal word the user must type. Default "VOID". */
  confirmWord?: string;
  confirmLabel?: string;
}

export function AppVoidConfirmModal({
  open,
  onClose,
  title,
  children,
  onConfirm,
  confirmWord = 'VOID',
  confirmLabel = 'Yes — void irreversibly',
}: AppVoidConfirmModalProps) {
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setReason('');
      setTyped('');
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const reasonOk = reason.trim().length > 0;
  const wordOk = typed.trim().toUpperCase() === confirmWord.toUpperCase();
  const canConfirm = reasonOk && wordOk;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-6"
      style={{ background: 'rgba(154,31,24,0.18)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        tabIndex={-1}
        className="w-full max-w-[520px] overflow-hidden rounded border border-oxblood bg-sheet shadow-[0_32px_80px_-32px_rgba(26,23,20,0.45)] outline-none"
      >
        {/* Hazard stripe — the only place we use it. */}
        <span
          className="block h-1.5"
          style={{
            background:
              'repeating-linear-gradient(45deg, var(--oxblood) 0 8px, var(--oxblood-bg) 8px 16px)',
          }}
          aria-hidden="true"
        />

        <div
          className="flex items-baseline gap-2.5 border-b px-[26px] pb-3.5 pt-[22px]"
          style={{ background: 'var(--oxblood-bg)', borderColor: 'var(--oxblood)' }}
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-oxblood">Critical</span>
          <span className="font-serif text-[22px] font-semibold leading-[1.1] tracking-[-0.018em] text-oxblood">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto cursor-pointer self-start border-0 bg-transparent p-0 text-oxblood hover:opacity-70"
          >
            <IconClose size={16} />
          </button>
        </div>

        <div className="px-[26px] pb-[22px] pt-[18px]">
          <div className="font-serif text-[15px] leading-[1.55] text-ink-secondary">{children}</div>

          <div className="mt-3 flex flex-col gap-1">
            <label
              htmlFor="void-reason"
              className="font-sans text-[11px] font-semibold tracking-[0.01em] text-ink-secondary"
            >
              Why are you voiding this? (required, audited)
            </label>
            <textarea
              id="void-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[60px] w-full rounded-card border border-sheet-edge bg-sheet px-[11px] py-2 font-sans text-[13px] text-ink outline-none focus:border-ink focus:shadow-[0_0_0_3px_rgba(14,92,58,0.18)]"
              placeholder="Explain the correction for the audit log…"
            />
          </div>

          <div className="mt-3.5 flex flex-col gap-1">
            <label htmlFor="void-word" className="font-sans text-[11px] font-semibold tracking-[0.01em] text-oxblood">
              Type the word {confirmWord} to confirm
            </label>
            <input
              id="void-word"
              value={typed}
              autoComplete="off"
              onChange={(e) => setTyped(e.target.value)}
              className="w-full rounded-[2px] border border-ink bg-sheet px-[13px] py-[11px] font-mono text-[16px] uppercase tracking-[0.06em] text-ink outline-none focus:border-oxblood focus:shadow-[0_0_0_3px_rgba(154,31,24,0.18)]"
            />
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2.5 border-t px-[22px] pb-[18px] pt-3.5"
          style={{ background: 'var(--oxblood-bg)', borderColor: 'var(--oxblood)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 cursor-pointer items-center rounded border border-ink bg-transparent px-3.5 font-sans text-[13px] font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            Cancel · keep it
          </button>
          <button
            type="button"
            aria-disabled={!canConfirm}
            disabled={!canConfirm}
            onClick={() => {
              if (canConfirm) onConfirm(reason.trim());
            }}
            className="inline-flex h-9 cursor-pointer items-center rounded border border-oxblood bg-oxblood px-4 font-sans text-[13px] font-semibold tracking-[0.04em] text-sheet transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
