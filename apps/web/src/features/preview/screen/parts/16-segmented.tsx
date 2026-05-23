import { useState } from 'react';

import { AppSegmented } from '@dipstick/ui';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

const RANGE_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
] as const;

const PRODUCT_OPTIONS = [
  { value: 'pms', label: 'PMS' },
  { value: 'ago', label: 'AGO' },
  { value: 'dpk', label: 'DPK' },
] as const;

export function SegmentedPart() {
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]['value']>('week');
  const [product, setProduct] = useState<(typeof PRODUCT_OPTIONS)[number]['value']>('pms');

  return (
    <div>
      <PageHead index="16 / PRIMITIVES" title="Segmented" subtitle="AppSegmented from @dipstick/ui" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        An ink-bordered strip; the active option fills ink with paper text. Used for the roll-up range and
        small either/or view toggles.
      </p>

      <RefBlock title="In a scene — roll-up controls">
        <RefRow label="range">
          <AppSegmented
            aria-label="Roll-up range"
            options={RANGE_OPTIONS}
            value={range}
            onValueChange={setRange}
          />
        </RefRow>
        <RefRow label="product">
          <AppSegmented
            aria-label="Product"
            options={PRODUCT_OPTIONS}
            value={product}
            onValueChange={setProduct}
          />
        </RefRow>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Selected value">
        <RefRow label="state">
          <span className="font-mono text-[13px]" style={{ color: 'var(--ink-2)' }}>
            range={range} · product={product}
          </span>
        </RefRow>
      </RefBlock>
    </div>
  );
}
