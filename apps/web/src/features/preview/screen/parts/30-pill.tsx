import { AppPill, type AppPillTone } from '@dipstick/ui';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

const TONES: readonly AppPillTone[] = ['default', 'ok', 'short', 'watch', 'info', 'ink', 'paper'];

export function PillPart() {
  return (
    <div>
      <PageHead index="30 / DISPLAY" title="Pill" subtitle="AppPill from @dipstick/ui" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        State in text colour and a hairline edge with a faint tint. There is no rainbow — ok carries
        posted / balanced / on-shift, short is oxblood for shortage and voids, watch is amber, info is the
        ink-blue system note.
      </p>

      <RefBlock title="Tones">
        {TONES.map((tone) => (
          <RefRow key={tone} label={tone}>
            <AppPill tone={tone}>{tone}</AppPill>
            <AppPill tone={tone} dot>
              with dot
            </AppPill>
          </RefRow>
        ))}
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="In context — real labels">
        <RefRow label="positive">
          <AppPill tone="ok" dot>
            Posted
          </AppPill>
          <AppPill tone="ok" dot>
            Balanced
          </AppPill>
          <AppPill tone="ok" dot>
            On shift
          </AppPill>
        </RefRow>
        <RefRow label="watch">
          <AppPill tone="watch" dot>
            Over · ₦440
          </AppPill>
          <AppPill tone="watch" dot>
            Reorder soon
          </AppPill>
        </RefRow>
        <RefRow label="short">
          <AppPill tone="short" dot>
            Short · ₦2,400
          </AppPill>
          <AppPill tone="short" dot>
            Voided
          </AppPill>
        </RefRow>
        <RefRow label="info">
          <AppPill tone="info" dot>
            Price change pending
          </AppPill>
          <AppPill tone="info" dot>
            Tanker en route
          </AppPill>
        </RefRow>
        <RefRow label="neutral">
          <AppPill>Draft</AppPill>
          <AppPill tone="paper">Off</AppPill>
          <AppPill tone="ink">Owner</AppPill>
        </RefRow>
      </RefBlock>
    </div>
  );
}
