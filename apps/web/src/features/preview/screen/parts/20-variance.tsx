import type { VarianceStatus } from '@dipstick/core';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

const PILL_STYLE: Record<VarianceStatus, { bg: string; fg: string; label: string }> = {
  balanced: { bg: 'var(--info-bg)', fg: 'var(--emerald)', label: 'Balanced · ₦0' },
  short: { bg: 'var(--oxblood-bg)', fg: 'var(--oxblood)', label: 'Short · ₦4,200' },
  over: { bg: 'var(--amber-bg)', fg: 'var(--amber)', label: 'Over · ₦1,150' },
};

interface VariancePillProps {
  readonly status: VarianceStatus;
}

function VariancePill({ status }: VariancePillProps) {
  const s = PILL_STYLE[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 font-mono"
      style={{ background: s.bg, color: s.fg, fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}
    >
      {s.label}
    </span>
  );
}

export function VariancePart() {
  return (
    <div>
      <PageHead
        index="20 / DOMAIN PATTERNS"
        title="Variance"
        subtitle="balanced · short · over — the reconciliation status pills"
      />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Each reconciliation row is flagged balanced (emerald), short (oxblood) or over (amber). The status
        type is <code>VarianceStatus</code> from <code>@dipstick/core</code>, so the preview and the app
        share one definition.
      </p>

      <RefBlock title="States">
        <RefRow label="balanced">
          <VariancePill status="balanced" />
        </RefRow>
        <RefRow label="short">
          <VariancePill status="short" />
        </RefRow>
        <RefRow label="over">
          <VariancePill status="over" />
        </RefRow>
      </RefBlock>
    </div>
  );
}
