import { AppGauge, AppProgressBar } from '@dipstick/ui';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

const BRANCHES = [
  { name: 'Mokola Station', city: 'IBADAN', value: 64, of: '1,928 / 3,000 L', tone: 'ok' as const },
  { name: 'Surulere', city: 'LAGOS', value: 85, of: '2,140 / 2,500 L', tone: 'ok' as const },
  { name: 'PH-Rumuola', city: 'RIVERS', value: 38, of: '1,140 / 3,000 L', tone: 'watch' as const },
];

export function ProgressPart() {
  return (
    <div>
      <PageHead index="37 / DISPLAY" title="Progress" subtitle="AppProgressBar · AppGauge from @dipstick/ui" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Always against a real target. The bar fills emerald when on pace, amber on watch, oxblood when
        behind; the thin ink line is an optional pace-target. The gauge is a ring for budget figures.
      </p>

      <RefBlock title="In a scene — sales vs daily target (target line at 75%)">
        <div className="w-full">
          {BRANCHES.map((b) => (
            <div
              key={b.name}
              className="grid items-center gap-4 py-2.5"
              style={{ gridTemplateColumns: '200px 1fr 60px 110px', borderTop: '1px solid var(--hair)' }}
            >
              <span className="font-serif text-[14px] font-medium" style={{ color: 'var(--ink)' }}>
                {b.name}
                <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.04em]" style={{ color: 'var(--ink-3)' }}>
                  {b.city}
                </span>
              </span>
              <AppProgressBar value={b.value} tone={b.tone} target={75} />
              <span className="text-right font-mono text-[13px] tabular-nums" style={{ color: b.tone === 'watch' ? 'var(--amber)' : 'var(--ink)' }}>
                {b.value}%
              </span>
              <span className="text-right font-mono text-[13px] tabular-nums" style={{ color: 'var(--ink-3)' }}>
                {b.of}
              </span>
            </div>
          ))}
        </div>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Bar tones">
        <RefRow label="ok">
          <div className="w-[260px]">
            <AppProgressBar value={72} tone="ok" />
          </div>
        </RefRow>
        <RefRow label="watch">
          <div className="w-[260px]">
            <AppProgressBar value={40} tone="watch" />
          </div>
        </RefRow>
        <RefRow label="short">
          <div className="w-[260px]">
            <AppProgressBar value={22} tone="short" />
          </div>
        </RefRow>
        <RefRow label="with target">
          <div className="w-[260px]">
            <AppProgressBar value={64} tone="ok" target={75} />
          </div>
        </RefRow>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Gauge — variance budget">
        <RefRow label="short · 45%">
          <AppGauge value={45} tone="short" aria-label="45% of monthly budget" />
        </RefRow>
        <RefRow label="ok · 72%">
          <AppGauge value={72} tone="ok" aria-label="72% complete" />
        </RefRow>
      </RefBlock>
    </div>
  );
}
