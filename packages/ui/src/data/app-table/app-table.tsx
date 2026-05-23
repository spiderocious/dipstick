import {
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
  type ReactNode,
} from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppTable — the ledger column. The product's bread and butter.
 *
 * Visual spec: design-system/projects/dipstick/preview/20-tables.html
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css  (.ledger :476-509)
 *
 * Composable parts: <AppTable><AppThead><AppTr><AppTh>… Headers are uppercase
 * mono; body alternates serif (names) and mono (numbers); totals are
 * double-ruled (AppTfoot); voided rows are struck through, never hidden.
 */
export function AppTable({ className, children, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn('w-full border-collapse', className)} {...rest}>
      {children}
    </table>
  );
}

export function AppThead({ className, children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={className} {...rest}>
      {children}
    </thead>
  );
}

export function AppTbody({ className, children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={className} {...rest}>
      {children}
    </tbody>
  );
}

export function AppTfoot({ className, children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot className={className} {...rest}>
      {children}
    </tfoot>
  );
}

export interface AppTrProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Struck-through, dimmed — but kept visible. */
  voided?: boolean;
}

export function AppTr({ voided, className, children, ...rest }: AppTrProps) {
  return (
    <tr
      className={cn(
        'hover:bg-sheet',
        voided === true && '[&>td]:text-ink-tertiary [&>td]:line-through',
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  );
}

export interface AppThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function AppTh({ numeric, className, children, ...rest }: AppThProps) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-y border-ink px-3.5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-tertiary',
        numeric === true ? 'text-right' : 'text-left',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export type AppTdVariant = 'default' | 'name' | 'numeric' | 'rec';

export interface AppTdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  variant?: AppTdVariant;
  /** Tint a numeric cell: ok = emerald, short = oxblood, over = amber. */
  tone?: 'ok' | 'short' | 'over';
  /** Foot cell — sits under the double rule. */
  foot?: boolean;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<AppTdVariant, string> = {
  default: 'font-sans text-[13px] text-ink',
  name: 'font-serif text-[14px] font-medium text-ink',
  numeric: 'text-right font-mono text-[13px] tabular-nums text-ink',
  rec: 'font-mono text-[11px] uppercase tracking-[0.04em] text-ink-tertiary',
};

const TONE_CLASSES = {
  ok: 'text-emerald',
  short: 'text-oxblood font-semibold',
  over: 'text-amber',
} as const;

export function AppTd({ variant = 'default', tone, foot, className, children, ...rest }: AppTdProps) {
  return (
    <td
      className={cn(
        'px-3.5 py-[13px] align-middle',
        foot === true ? 'border-t-2 border-ink' : 'border-b border-hair',
        VARIANT_CLASSES[variant],
        foot === true && variant === 'name' && 'font-semibold',
        tone !== undefined && TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}
