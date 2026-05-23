import type { Product } from '@dipstick/core';

import { type HTMLAttributes } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppProductMark — the PMS / AGO / DPK inline mark.
 *
 * Visual spec: design-system/projects/dipstick/preview/26-avatars-pills.html
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css  (.prod :342-358)
 *
 * A tiny mono uppercase label with a small square colour chip — emerald (PMS),
 * amber (AGO), plum (DPK). Used inline on rows and tank labels, never as a fill.
 */
export interface AppProductMarkProps extends HTMLAttributes<HTMLSpanElement> {
  product: Product;
  /** Hide the text label and show only the colour chip. */
  chipOnly?: boolean;
}

const CHIP_CLASS: Record<Product, string> = {
  PMS: 'bg-pms',
  AGO: 'bg-ago',
  DPK: 'bg-dpk',
};

const TEXT_CLASS: Record<Product, string> = {
  PMS: 'text-pms',
  AGO: 'text-ago',
  DPK: 'text-dpk',
};

export function AppProductMark({ product, chipOnly, className, ...rest }: AppProductMarkProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]',
        TEXT_CLASS[product],
        className,
      )}
      {...rest}
    >
      <span className={cn('h-[7px] w-[7px] rounded-[1px]', CHIP_CLASS[product])} aria-hidden="true" />
      {chipOnly !== true && product}
    </span>
  );
}
