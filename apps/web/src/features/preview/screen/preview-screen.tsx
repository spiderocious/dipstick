import { lazy, Suspense, useState, type LazyExoticComponent } from 'react';

// Pull in the @dipstick/ui design tokens (CSS custom properties) used across
// the preview parts. This is a dev-facing storybook, so importing the package
// stylesheet here is intentional and self-contained.
import '@dipstick/ui/styles.css';

import { PreviewSidebar } from './parts/preview-sidebar.tsx';

type Part = LazyExoticComponent<() => React.ReactElement>;

const PARTS: Record<string, Part> = {
  palette: lazy(() => import('./parts/01-palette.tsx').then((m) => ({ default: m.PalettePart }))),
  type: lazy(() => import('./parts/02-type.tsx').then((m) => ({ default: m.TypePart }))),
  figures: lazy(() => import('./parts/03-figures.tsx').then((m) => ({ default: m.FiguresPart }))),
  icons: lazy(() => import('./parts/04-icons.tsx').then((m) => ({ default: m.IconsPart }))),
  buttons: lazy(() => import('./parts/10-buttons.tsx').then((m) => ({ default: m.ButtonsPart }))),
  text: lazy(() => import('./parts/11-text.tsx').then((m) => ({ default: m.TextPart }))),
  fields: lazy(() => import('./parts/12-fields.tsx').then((m) => ({ default: m.FieldsPart }))),
  checkbox: lazy(() => import('./parts/13-checkbox.tsx').then((m) => ({ default: m.CheckboxPart }))),
  radio: lazy(() => import('./parts/14-radio.tsx').then((m) => ({ default: m.RadioPart }))),
  switch: lazy(() => import('./parts/15-switch.tsx').then((m) => ({ default: m.SwitchPart }))),
  segmented: lazy(() => import('./parts/16-segmented.tsx').then((m) => ({ default: m.SegmentedPart }))),
  select: lazy(() => import('./parts/17-select.tsx').then((m) => ({ default: m.SelectPart }))),
  pill: lazy(() => import('./parts/30-pill.tsx').then((m) => ({ default: m.PillPart }))),
  flag: lazy(() => import('./parts/31-flag.tsx').then((m) => ({ default: m.FlagPart }))),
  avatar: lazy(() => import('./parts/32-avatar.tsx').then((m) => ({ default: m.AvatarPart }))),
  'product-mark': lazy(() =>
    import('./parts/33-product-mark.tsx').then((m) => ({ default: m.ProductMarkPart })),
  ),
  sheet: lazy(() => import('./parts/34-sheet.tsx').then((m) => ({ default: m.SheetPart }))),
  figure: lazy(() => import('./parts/35-figure.tsx').then((m) => ({ default: m.FigurePart }))),
  table: lazy(() => import('./parts/36-table.tsx').then((m) => ({ default: m.TablePart }))),
  progress: lazy(() => import('./parts/37-progress.tsx').then((m) => ({ default: m.ProgressPart }))),
  skeleton: lazy(() => import('./parts/38-skeleton.tsx').then((m) => ({ default: m.SkeletonPart }))),
  tooltip: lazy(() => import('./parts/39-tooltip.tsx').then((m) => ({ default: m.TooltipPart }))),
  modal: lazy(() => import('./parts/40-modal.tsx').then((m) => ({ default: m.ModalPart }))),
  alerts: lazy(() => import('./parts/41-alerts.tsx').then((m) => ({ default: m.AlertsPart }))),
  drawer: lazy(() => import('./parts/42-drawer.tsx').then((m) => ({ default: m.DrawerPart }))),
  variance: lazy(() => import('./parts/20-variance.tsx').then((m) => ({ default: m.VariancePart }))),
};

export function PreviewScreen() {
  const [activeId, setActiveId] = useState('palette');

  const ActivePart = PARTS[activeId];

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ display: 'grid', gridTemplateColumns: '280px 1fr', background: 'var(--paper)' }}
    >
      <PreviewSidebar activeId={activeId} onSelect={setActiveId} />

      <main className="flex flex-col min-h-0 min-w-0" style={{ background: 'var(--paper)' }}>
        <header
          className="flex-shrink-0 flex items-baseline gap-4 px-7 py-[18px]"
          style={{ borderBottom: '1px solid var(--sheet-edge)', background: 'var(--paper)' }}
        >
          <span
            className="font-sans font-semibold uppercase"
            style={{ fontSize: '11px', letterSpacing: '0.16em', color: 'var(--ink-3)' }}
          >
            Dipstick DS
          </span>
          <span style={{ color: 'var(--hair)', fontSize: '11px' }}>·</span>
          <span
            className="font-sans font-semibold uppercase"
            style={{ fontSize: '11px', letterSpacing: '0.16em', color: 'var(--ink)' }}
          >
            {activeId}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto" style={{ padding: '48px 64px 96px' }}>
          <Suspense
            fallback={
              <div
                className="font-mono text-[11px] uppercase"
                style={{ letterSpacing: '0.14em', color: 'var(--ink-3)' }}
              >
                Loading…
              </div>
            }
          >
            {ActivePart !== undefined ? <ActivePart /> : <p style={{ color: 'var(--ink-3)' }}>Coming soon.</p>}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
