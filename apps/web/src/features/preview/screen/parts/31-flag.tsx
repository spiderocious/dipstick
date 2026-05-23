import { AppFlag } from '@dipstick/ui';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

export function FlagPart() {
  return (
    <div>
      <PageHead index="31 / DISPLAY" title="Flag" subtitle="AppFlag from @dipstick/ui" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        A tiny mono variance tag, used inline beside a number — never to colour an entire row. ok is an
        emerald outline (balanced), over is amber, short is solid oxblood.
      </p>

      <RefBlock title="Tones">
        <RefRow label="ok">
          <AppFlag tone="ok">OK</AppFlag>
        </RefRow>
        <RefRow label="over">
          <AppFlag tone="over">+₦440</AppFlag>
        </RefRow>
        <RefRow label="short">
          <AppFlag tone="short">−₦2,400</AppFlag>
        </RefRow>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="In context — beside a figure">
        <RefRow label="balanced">
          <span className="font-mono text-[15px] tabular-nums" style={{ color: 'var(--ink)' }}>
            ₦159,544.00
          </span>
          <AppFlag tone="ok">OK</AppFlag>
        </RefRow>
        <RefRow label="over">
          <span className="font-mono text-[15px] tabular-nums" style={{ color: 'var(--ink)' }}>
            ₦160,984.00
          </span>
          <AppFlag tone="over">+₦440</AppFlag>
        </RefRow>
        <RefRow label="short">
          <span className="font-mono text-[15px] tabular-nums" style={{ color: 'var(--ink)' }}>
            ₦157,144.00
          </span>
          <AppFlag tone="short">−₦2,400</AppFlag>
        </RefRow>
      </RefBlock>
    </div>
  );
}
