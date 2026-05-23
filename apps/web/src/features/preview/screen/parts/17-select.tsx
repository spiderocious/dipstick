import { useState } from 'react';

import { AppSelect, FieldRow } from '@dipstick/ui';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

export function SelectPart() {
  const [branch, setBranch] = useState('all');

  return (
    <div>
      <PageHead index="17 / PRIMITIVES" title="Select" subtitle="AppSelect from @dipstick/ui" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        A styled native <code>&lt;select&gt;</code> — keyboard and screen-reader behaviour come for free; the
        caret is an overlaid icon. Pair with <code>FieldRow</code> for a label.
      </p>

      <RefBlock title="In a scene — roll-up filter">
        <RefRow label="branch">
          <AppSelect value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Branch">
            <option value="all">All branches</option>
            <option value="mokola">Mokola</option>
            <option value="surulere">Surulere</option>
            <option value="ph">PH · Rumuola</option>
          </AppSelect>
        </RefRow>
        <RefRow label="product">
          <AppSelect defaultValue="pms" aria-label="Product">
            <option value="pms">PMS</option>
            <option value="ago">AGO</option>
            <option value="dpk">DPK</option>
          </AppSelect>
        </RefRow>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Sizes & states">
        <RefRow label="sm">
          <AppSelect fieldSize="sm" aria-label="Small">
            <option>Day</option>
            <option>Week</option>
          </AppSelect>
        </RefRow>
        <RefRow label="lg">
          <AppSelect fieldSize="lg" aria-label="Large">
            <option>All branches</option>
          </AppSelect>
        </RefRow>
        <RefRow label="invalid">
          <AppSelect invalid aria-label="Invalid">
            <option>Choose a branch…</option>
          </AppSelect>
        </RefRow>
        <RefRow label="disabled">
          <AppSelect disabled aria-label="Disabled">
            <option>Mokola</option>
          </AppSelect>
        </RefRow>
        <RefRow label="with label">
          <div className="w-[240px]">
            <FieldRow label="Default branch" htmlFor="def-branch">
              <AppSelect id="def-branch" className="w-full">
                <option>Mokola</option>
                <option>Surulere</option>
              </AppSelect>
            </FieldRow>
          </div>
        </RefRow>
      </RefBlock>
    </div>
  );
}
