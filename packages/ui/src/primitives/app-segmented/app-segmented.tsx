import { cn } from '../../utils/cn.js';

/**
 * AppSegmented — a compact range / view switch.
 *
 * Visual spec: design-system/projects/dipstick/preview/12-selection.html  (.seg)
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css
 *
 * An ink-bordered strip; the active option fills ink with paper text. Used for
 * day/week/month/year ranges and small either/or view toggles.
 */
export interface AppSegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface AppSegmentedProps<T extends string> {
  options: readonly AppSegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
  /** Accessible label for the group. */
  'aria-label'?: string;
}

export function AppSegmented<T extends string>({
  options,
  value,
  onValueChange,
  className,
  'aria-label': ariaLabel,
}: AppSegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex overflow-hidden rounded-[3px] border border-ink', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              'border-0 border-r border-ink px-[14px] py-[7px] font-sans text-xs font-medium tracking-[0.02em] last:border-r-0',
              'cursor-pointer transition-colors',
              active ? 'bg-ink text-paper' : 'bg-sheet text-ink-secondary hover:text-ink',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
