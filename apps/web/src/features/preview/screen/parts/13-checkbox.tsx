import { useState } from 'react';

import { AppCheckbox } from '@dipstick/ui';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

export function CheckboxPart() {
  const [filters, setFilters] = useState({
    variance: true,
    voided: false,
    grouped: true,
    otherTanks: false,
  });

  return (
    <div>
      <PageHead index="13 / PRIMITIVES" title="Checkbox" subtitle="AppCheckbox from @dipstick/ui" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Unchecked is an ink-outline box on sheet; checked fills emerald with a sheet tick. Selection is one
        calm signal — never multi-coloured.
      </p>

      <RefBlock title="In a scene — filter the day-book">
        <div className="flex flex-col gap-2.5 py-1">
          <AppCheckbox
            label="Only shifts with variance"
            checked={filters.variance}
            onChange={(e) => setFilters((f) => ({ ...f, variance: e.target.checked }))}
          />
          <AppCheckbox
            label="Include voided entries (audit)"
            checked={filters.voided}
            onChange={(e) => setFilters((f) => ({ ...f, voided: e.target.checked }))}
          />
          <AppCheckbox
            label="Group by attendant"
            checked={filters.grouped}
            onChange={(e) => setFilters((f) => ({ ...f, grouped: e.target.checked }))}
          />
          <AppCheckbox
            label="Include AGO and DPK tanks"
            checked={filters.otherTanks}
            onChange={(e) => setFilters((f) => ({ ...f, otherTanks: e.target.checked }))}
          />
        </div>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="States">
        <RefRow label="unchecked">
          <AppCheckbox label="Unchecked" defaultChecked={false} />
        </RefRow>
        <RefRow label="checked">
          <AppCheckbox label="Checked" defaultChecked />
        </RefRow>
        <RefRow label="disabled">
          <AppCheckbox label="Disabled" disabled />
        </RefRow>
        <RefRow label="disabled · checked">
          <AppCheckbox label="Disabled checked" disabled defaultChecked />
        </RefRow>
      </RefBlock>
    </div>
  );
}
