import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppField — the litre / naira / meter input family.
 *
 * Visual spec: design-system/projects/dipstick/preview/11-inputs.html
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css  (.f, .f-affix, .field-row :254-318)
 *
 * Numbers use tabular monospace (`numeric`). The right/left affix carries the
 * unit — ₦, /L, L — in a quieter recessed pane. Wrap with <FieldRow> for the
 * label / help / error scaffold.
 */
export type AppFieldSize = 'sm' | 'md' | 'lg';

export interface AppInputProps extends InputHTMLAttributes<HTMLInputElement> {
  fieldSize?: AppFieldSize;
  /** Monospace, tabular numerals — for litres, naira, meters. */
  numeric?: boolean;
  invalid?: boolean;
  /** Affix content shown before the value (e.g. ₦). */
  leadingAffix?: ReactNode;
  /** Affix content shown after the value (e.g. L, /L). */
  trailingAffix?: ReactNode;
}

const SIZE_CLASSES: Record<AppFieldSize, string> = {
  sm: 'h-7 px-[9px] text-xs',
  md: 'h-[34px] px-[11px] text-[13px]',
  lg: 'h-11 px-[14px] text-[15px]',
};

const BASE_FIELD =
  'w-full bg-sheet text-ink rounded-card border border-sheet-edge outline-none transition-colors ' +
  'placeholder:text-ink-tertiary hover:border-ink-tertiary ' +
  'focus:border-ink focus:shadow-[0_0_0_3px_rgba(14,92,58,0.18)] ' +
  'disabled:bg-recessed disabled:text-ink-tertiary disabled:cursor-not-allowed';

const INVALID_FIELD =
  'border-oxblood focus:border-oxblood focus:shadow-[0_0_0_3px_rgba(154,31,24,0.18)]';

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(function AppInput(
  { fieldSize = 'md', numeric, invalid, leadingAffix, trailingAffix, className, ...rest },
  ref,
) {
  const affixed = leadingAffix !== undefined || trailingAffix !== undefined;
  const field = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        BASE_FIELD,
        SIZE_CLASSES[fieldSize],
        numeric && 'font-mono tabular-nums',
        invalid && INVALID_FIELD,
        affixed && 'border-0 bg-transparent shadow-none focus:shadow-none rounded-none flex-1 min-w-0',
        className,
      )}
      {...rest}
    />
  );

  if (!affixed) return field;

  // Affixed field — the box owns the border + focus ring; the input goes bare inside.
  return (
    <div
      className={cn(
        'flex items-stretch overflow-hidden rounded-card border border-sheet-edge bg-sheet transition-colors',
        'focus-within:border-ink focus-within:shadow-[0_0_0_3px_rgba(14,92,58,0.18)]',
        invalid && 'border-oxblood focus-within:border-oxblood focus-within:shadow-[0_0_0_3px_rgba(154,31,24,0.18)]',
      )}
    >
      {leadingAffix !== undefined && (
        <span className="inline-flex items-center border-r border-sheet-edge bg-recessed px-[11px] font-mono text-xs text-ink-tertiary">
          {leadingAffix}
        </span>
      )}
      {field}
      {trailingAffix !== undefined && (
        <span className="inline-flex items-center border-l border-sheet-edge bg-recessed px-[11px] font-mono text-xs text-ink-tertiary">
          {trailingAffix}
        </span>
      )}
    </div>
  );
});

export interface AppTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>(function AppTextarea(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        BASE_FIELD,
        'min-h-[72px] py-2 px-[11px] text-[13px] leading-relaxed',
        invalid && INVALID_FIELD,
        className,
      )}
      {...rest}
    />
  );
});

export interface FieldRowProps {
  label?: ReactNode;
  /** Small mono caption beside the label (e.g. FROM MORNING). */
  badge?: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

/** Label / help / error scaffold around any field. Mirrors `.field-row`. */
export function FieldRow({ label, badge, help, error, htmlFor, children, className }: FieldRowProps) {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label !== undefined && (
        <label
          htmlFor={id}
          className="font-sans text-[11px] font-semibold text-ink-secondary tracking-[0.01em]"
        >
          {label}
          {badge !== undefined && (
            <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.04em] text-ink-tertiary">
              {badge}
            </span>
          )}
        </label>
      )}
      {children}
      {error !== undefined ? (
        <span className="font-sans text-[11px] text-oxblood">{error}</span>
      ) : (
        help !== undefined && <span className="font-sans text-[11px] text-ink-tertiary">{help}</span>
      )}
    </div>
  );
}
