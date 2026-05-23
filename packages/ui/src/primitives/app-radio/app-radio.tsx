import {
  createContext,
  forwardRef,
  useContext,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppRadio / AppRadioGroup — single-choice selection.
 *
 * Visual spec: design-system/projects/dipstick/preview/12-selection.html  (.radio)
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css
 *
 * Unchecked is an ink-outline ring on sheet; checked shows an emerald dot.
 * Wrap items in <AppRadioGroup name value onChange> for controlled selection.
 */
interface RadioGroupContext {
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioCtx = createContext<RadioGroupContext | null>(null);

export interface AppRadioGroupProps {
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function AppRadioGroup({ name, value, onValueChange, children, className }: AppRadioGroupProps) {
  return (
    <RadioCtx.Provider value={{ name, value, onValueChange }}>
      <div role="radiogroup" className={cn('flex flex-col gap-2', className)}>
        {children}
      </div>
    </RadioCtx.Provider>
  );
}

export interface AppRadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'value'> {
  value: string;
  label?: ReactNode;
}

export const AppRadio = forwardRef<HTMLInputElement, AppRadioProps>(function AppRadio(
  { value, label, className, disabled, onChange, ...rest },
  ref,
) {
  const ctx = useContext(RadioCtx);
  const checked = ctx?.value !== undefined ? ctx.value === value : undefined;

  return (
    <label
      className={cn(
        'group inline-flex items-center gap-2.5 font-sans text-[13px] text-ink-secondary',
        disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
        className,
      )}
    >
      <input
        ref={ref}
        type="radio"
        name={ctx?.name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(e) => {
          ctx?.onValueChange?.(value);
          onChange?.(e);
        }}
        className="peer sr-only"
        {...rest}
      />
      <span
        className={cn(
          'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-ink-tertiary bg-sheet transition-colors',
          'peer-checked:border-emerald',
          'peer-focus-visible:shadow-[0_0_0_3px_rgba(14,92,58,0.28)]',
          '[&>span]:opacity-0 peer-checked:[&>span]:opacity-100',
        )}
      >
        <span className="h-2 w-2 rounded-full bg-emerald transition-opacity" />
      </span>
      {label !== undefined && <span>{label}</span>}
    </label>
  );
});
