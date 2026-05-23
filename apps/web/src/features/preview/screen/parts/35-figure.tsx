import { AppFigure, type AppFigureSize } from '@dipstick/ui';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

const SIZES: readonly AppFigureSize[] = ['sm', 'md', 'lg', 'xl'];

export function FigurePart() {
  return (
    <div>
      <PageHead index="35 / DISPLAY" title="Figure" subtitle="AppFigure — the readout family" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        When a number is the most important thing on the screen, it is the loudest object — large, mono,
        tabular. <code>unit</code> adds a small sans suffix; <code>naira</code> prefixes ₦; <code>tone</code>{' '}
        tints short (oxblood) or ok (emerald).
      </p>

      <RefBlock title="Sizes">
        {SIZES.map((size) => (
          <RefRow key={size} label={size}>
            <AppFigure value="814.00" size={size} unit="L" />
          </RefRow>
        ))}
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Tones & money">
        <RefRow label="default · naira">
          <AppFigure value="159,544.00" naira size="lg" />
        </RefRow>
        <RefRow label="ok · balanced">
          <AppFigure value="+ 0.00" naira size="lg" tone="ok" />
        </RefRow>
        <RefRow label="short">
          <AppFigure value="− 2,400.00" naira size="lg" tone="short" />
        </RefRow>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="In a scene — shift variance">
        <div className="w-full">
          <div className="font-sans font-semibold uppercase" style={{ fontSize: '11px', letterSpacing: '0.18em', color: 'var(--ink-3)' }}>
            Variance
          </div>
          <div className="mt-1">
            <AppFigure value="+ 0.00" naira size="xl" tone="ok" />
          </div>
          <div className="mt-1 font-mono uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em', color: 'var(--ink-3)' }}>
            Femi · 814 L · balanced
          </div>
        </div>
      </RefBlock>
    </div>
  );
}
