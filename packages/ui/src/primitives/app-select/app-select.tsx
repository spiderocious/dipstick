import { forwardRef, type SelectHTMLAttributes } from 'react';

import { IconChevronDown } from '../../icons/index.js';
import { cn } from '../../utils/cn.js';

/**
 * AppSelect — a styled native dropdown.
 *
 * Visual spec: design-system/projects/dipstick/preview/12-selection.html  (.select-mock)
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css  (.f)
 *
 * Wraps a real <select> so keyboard + a11y come for free; the caret is an
 * overlaid icon. Sheet background, sheet-edge border, ink-focus ring.
 */
export type AppSelectSize = 'sm' | 'md' | 'lg';

export interface AppSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  fieldSize?: AppSelectSize;
  invalid?: boolean;
}

const SIZE_CLASSES: Record<AppSelectSize, string> = {
  sm: 'h-7 pl-[9px] pr-7 text-xs',
  md: 'h-[34px] pl-[11px] pr-8 text-[13px]',
  lg: 'h-11 pl-[14px] pr-9 text-[15px]',
};

export const AppSelect = forwardRef<HTMLSelectElement, AppSelectProps>(function AppSelect(
  { fieldSize = 'md', invalid, className, children, disabled, ...rest },
  ref,
) {
  return (
    <div className="relative inline-flex min-w-[200px]">
      <select
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          'w-full appearance-none rounded-card border border-sheet-edge bg-sheet font-sans text-ink outline-none transition-colors',
          'hover:border-ink-tertiary focus:border-ink focus:shadow-[0_0_0_3px_rgba(14,92,58,0.18)]',
          'disabled:cursor-not-allowed disabled:bg-recessed disabled:text-ink-tertiary',
          invalid && 'border-oxblood focus:border-oxblood focus:shadow-[0_0_0_3px_rgba(154,31,24,0.18)]',
          SIZE_CLASSES[fieldSize],
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <IconChevronDown
        size={15}
        aria-hidden="true"
        className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 text-ink-tertiary"
      />
    </div>
  );
});
