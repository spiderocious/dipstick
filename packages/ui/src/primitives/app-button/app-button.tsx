import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppButton — the three+two voices of Dipstick.
 *
 * Visual spec: design-system/projects/dipstick/preview/10-buttons.html
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css  (.b rules, :207-252)
 *
 * primary   — emerald commitment: post, save, confirm offload.
 * secondary — ink-outline acknowledgement: cancel, edit, back (hover fills ink).
 * quiet     — text-only, faint hover: save draft, dismiss, skip.
 * ghost     — hairline border, hover firms to ink: filter, sort, export.
 * danger    — oxblood, reserved for voids & irreversible actions.
 */
export type AppButtonVariant = 'primary' | 'secondary' | 'quiet' | 'ghost' | 'danger';
export type AppButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<AppButtonVariant, string> = {
  primary:
    'bg-emerald text-sheet border border-emerald hover:bg-emerald-hover hover:border-emerald-hover focus-visible:ring-emerald',
  secondary:
    'bg-transparent text-ink border border-ink hover:bg-ink hover:text-paper focus-visible:ring-ink',
  quiet:
    'bg-transparent text-ink-secondary border border-transparent hover:bg-ink/5 hover:text-ink focus-visible:ring-ink',
  ghost:
    'bg-transparent text-ink-tertiary border border-hair hover:text-ink hover:border-ink focus-visible:ring-ink',
  // Oxblood — reserved for the void idiom and irreversible actions only.
  danger:
    'bg-transparent text-oxblood border border-oxblood hover:bg-oxblood-bg focus-visible:ring-oxblood',
};

const SIZE_CLASSES: Record<AppButtonSize, string> = {
  sm: 'h-[26px] px-[10px] text-xs gap-1.5',
  md: 'h-8 px-[14px] text-[13px] gap-1.5',
  lg: 'h-10 px-[18px] text-sm gap-2',
};

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(function AppButton(
  { variant = 'primary', size = 'md', className, loading, leadingIcon, trailingIcon, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded font-sans font-medium',
        'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        'disabled:cursor-not-allowed disabled:opacity-45',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      {leadingIcon ? <span className="-ml-0.5 inline-flex">{leadingIcon}</span> : null}
      <span>{loading ? 'Loading…' : children}</span>
      {trailingIcon ? <span className="-mr-0.5 inline-flex">{trailingIcon}</span> : null}
    </button>
  );
});
