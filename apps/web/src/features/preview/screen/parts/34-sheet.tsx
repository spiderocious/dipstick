import { AppPill, AppSheet, SheetHead } from '@dipstick/ui';

import { PageHead, RefBlock } from './preview-canvas.tsx';

export function SheetPart() {
  return (
    <div>
      <PageHead index="34 / DISPLAY" title="Sheet" subtitle="AppSheet · SheetHead from @dipstick/ui" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        The only card idiom — a paper sheet with a hairline edge, never a shadow. <code>SheetHead</code> is
        the recurring serif-title + mono-meta header row that opens most scenes.
      </p>

      <RefBlock title="Padding">
        <div className="grid w-full gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <AppSheet pad="tight">
            <span className="font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
              tight
            </span>
          </AppSheet>
          <AppSheet pad="md">
            <span className="font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
              md
            </span>
          </AppSheet>
          <AppSheet pad="lg">
            <span className="font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
              lg
            </span>
          </AppSheet>
        </div>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Tone">
        <div className="grid w-full gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <AppSheet>
            <span className="font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
              default · sheet
            </span>
          </AppSheet>
          <AppSheet deep>
            <span className="font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
              deep · recessed
            </span>
          </AppSheet>
        </div>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="With SheetHead — a scene">
        <AppSheet className="w-full">
          <SheetHead
            title="End of shift — Pump 03 / evening"
            meta={
              <span className="inline-flex items-center gap-2">
                SHIFT-MOK-2026-05-14-PM
                <AppPill tone="ok" dot>
                  Balanced
                </AppPill>
              </span>
            }
          />
          <p className="font-sans text-[13px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            Femi dispensed 814 L. Cash declared matched expected gross to the naira. This sheet is the
            atom every scene is built from.
          </p>
        </AppSheet>
      </RefBlock>
    </div>
  );
}
