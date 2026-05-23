import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppSwitch — a per-branch preference toggle.
 *
 * Visual spec: design-system/projects/dipstick/preview/12-selection.html  (.switch)
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css
 *
 * Off is a recessed track with an ink knob; on fills emerald and the knob goes
 * sheet. Used for settings, never for a destructive action.
 */
export interface AppSwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
}

export const AppSwitch = forwardRef<HTMLInputElement, AppSwitchProps>(function AppSwitch(
  { label, className, disabled, ...rest },
  ref,
) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-2.5 font-sans text-[13px] text-ink-secondary',
        disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
        className,
      )}
    >
      <input ref={ref} type="checkbox" role="switch" disabled={disabled} className="peer sr-only" {...rest} />
      <span
        className={cn(
          'relative h-[18px] w-8 flex-shrink-0 rounded-full border border-sheet-edge bg-recessed transition-colors',
          'peer-checked:border-emerald peer-checked:bg-emerald',
          'peer-focus-visible:shadow-[0_0_0_3px_rgba(14,92,58,0.28)]',
          'after:absolute after:left-px after:top-px after:h-3.5 after:w-3.5 after:rounded-full after:bg-ink after:transition-transform',
          'peer-checked:after:translate-x-3.5 peer-checked:after:bg-sheet',
        )}
      />
      {label !== undefined && <span>{label}</span>}
    </label>
  );
});
