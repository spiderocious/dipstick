import { AppProductMark } from '@dipstick/ui';
import type { Product } from '@dipstick/core';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

const PRODUCTS: readonly Product[] = ['PMS', 'AGO', 'DPK'];

export function ProductMarkPart() {
  return (
    <div>
      <PageHead
        index="33 / DISPLAY"
        title="Product mark"
        subtitle="AppProductMark — PMS / AGO / DPK"
      />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        A tiny mono mark with a colour chip — emerald (PMS), amber (AGO), plum (DPK). Used inline on rows and
        tank labels, never as a chromatic fill. The <code>Product</code> type comes from{' '}
        <code>@dipstick/core</code>.
      </p>

      <RefBlock title="Products">
        {PRODUCTS.map((product) => (
          <RefRow key={product} label={product}>
            <AppProductMark product={product} />
          </RefRow>
        ))}
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Chip only">
        <RefRow label="chips">
          {PRODUCTS.map((product) => (
            <AppProductMark key={product} product={product} chipOnly />
          ))}
        </RefRow>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="In context — pump rows">
        {[
          { pump: 'Pump 1', product: 'PMS' as Product },
          { pump: 'Pump 2', product: 'PMS' as Product },
          { pump: 'Pump 3', product: 'AGO' as Product },
          { pump: 'Tank 4', product: 'DPK' as Product },
        ].map((r) => (
          <RefRow key={r.pump} label={r.pump}>
            <AppProductMark product={r.product} />
          </RefRow>
        ))}
      </RefBlock>
    </div>
  );
}
