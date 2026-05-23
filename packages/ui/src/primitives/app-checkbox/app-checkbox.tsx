import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppCheckbox — calm, single-signal selection.
 *
 * Visual spec: design-system/projects/dipstick/preview/12-selection.html  (.check)
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css
 *
 * Unchecked is an ink-outline box on sheet; checked fills emerald with a sheet
 * tick. Selection is one calm signal — never multi-coloured.
 */
export interface AppCheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
}

export const AppCheckbox = forwardRef<HTMLInputElement, AppCheckboxProps>(function AppCheckbox(
  { label, className, disabled, ...rest },
  ref,
) {
  return (
    <label
      className={cn(
        'group inline-flex items-center gap-2.5 font-sans text-[13px] text-ink-secondary',
        disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
        className,
      )}
    >
      <input ref={ref} type="checkbox" disabled={disabled} className="peer sr-only" {...rest} />
      <span
        className={cn(
          'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[2px] border border-ink-tertiary bg-sheet transition-colors',
          'peer-checked:border-emerald peer-checked:bg-emerald',
          'peer-focus-visible:shadow-[0_0_0_3px_rgba(14,92,58,0.28)]',
          '[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100',
        )}
      >
        <svg viewBox="0 0 12 12" className="h-3 w-3 text-sheet transition-opacity" fill="none" aria-hidden="true">
          <path d="M2.5 6.2 5 8.7 9.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label !== undefined && <span>{label}</span>}
    </label>
  );
});
