import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

export type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<AppButtonVariant, string> = {
  primary:
    'bg-[#0E5C3A] text-[#FBF7EC] hover:bg-[#0A4A2E] focus-visible:ring-[#0A4A2E] disabled:opacity-60',
  secondary:
    'bg-[#FBF7EC] text-[#0E5C3A] border border-[#D6CDB8] hover:bg-[#ECE5D4] focus-visible:ring-[#0E5C3A] disabled:opacity-60',
  ghost:
    'bg-transparent text-[#0E5C3A] hover:bg-[#0E5C3A]/5 focus-visible:ring-[#0E5C3A] disabled:opacity-60',
  // Oxblood — reserved for the void idiom and irreversible actions only.
  danger:
    'bg-[#9A1F18] text-white hover:bg-[#7E1813] focus-visible:ring-[#9A1F18] disabled:opacity-60',
};

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(function AppButton(
  { variant = 'primary', className, loading, leadingIcon, trailingIcon, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2',
        'text-sm font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      {leadingIcon ? <span className="-ml-0.5">{leadingIcon}</span> : null}
      <span>{loading ? 'Loading…' : children}</span>
      {trailingIcon ? <span className="-mr-0.5">{trailingIcon}</span> : null}
    </button>
  );
});
