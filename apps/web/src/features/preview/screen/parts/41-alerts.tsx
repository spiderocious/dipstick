import { AppBanner, AppButton, AppInlineAlert, AppToast } from '@dipstick/ui';

import { PageHead, SectionBreak } from './preview-canvas.tsx';

export function AlertsPart() {
  return (
    <div>
      <PageHead
        index="41 / FEEDBACK"
        title="Toasts & banners"
        subtitle="AppToast · AppBanner · AppInlineAlert from @dipstick/ui"
      />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Toasts are dark ink rectangles that announce a done action and disappear. Banners are page-level
        sheets carrying state. Inline alerts live inside the row they describe.
      </p>

      <SectionBreak label="Toasts — momentary" />
      <div className="flex flex-col items-start gap-3.5">
        <AppToast mark="✓ POSTED" onUndo={() => undefined} undoLabel="UNDO · 6s">
          Evening shift signed off — Mokola.
        </AppToast>
        <AppToast mark="✓ ADDED" onUndo={() => undefined} undoLabel="UNDO · 4s">
          Expense EXP-018 — pump 04 belt · ₦8,500
        </AppToast>
        <AppToast tone="error" mark="! FAILED">
          Couldn't reach server — entry saved locally, will sync.
        </AppToast>
        <AppToast tone="delivered" mark="✓ DELIVERED">
          Tanker A-44218 confirmed — 33,000 L PMS at Mokola.
        </AppToast>
      </div>

      <SectionBreak label="Banners — page-level state" />
      <div className="flex flex-col gap-3.5">
        <AppBanner tone="ok" mark="Posted" action={<AppButton variant="quiet" size="sm">Dismiss</AppButton>}>
          Yesterday's books are <strong>closed and signed</strong>. Variance ₦0 across three branches — a
          clean day.
        </AppBanner>
        <AppBanner tone="watch" mark="Reorder" action={<AppButton variant="secondary" size="sm">View delivery</AppButton>}>
          DPK at <strong>Mokola — 1,320 L (12% of tank)</strong>. NIPCO offload pending tomorrow 06:30.
        </AppBanner>
        <AppBanner tone="short" mark="Shortage" action={<AppButton variant="danger" size="sm">Open shift</AppButton>}>
          Chidera Okoye — <strong>P-02 short ₦2,400</strong>. Note attached, awaiting your review.
        </AppBanner>
        <AppBanner tone="info" mark="Price change" action={<AppButton variant="secondary" size="sm">Review</AppButton>}>
          PMS new price <strong>₦210 / L</strong> set by Segun · effective Wed 15 May 06:00.
        </AppBanner>
        <AppBanner tone="ink" mark="System">
          Daily backup ran at 02:14 — 3 branches, 4,820 entries archived.
        </AppBanner>
      </div>

      <SectionBreak label="Inline alerts — at the row level" />
      <div className="flex flex-col gap-3">
        <AppInlineAlert
          tone="short"
          mark="Short"
          action={
            <>
              <AppButton variant="ghost" size="sm">
                Open shift
              </AppButton>
              <AppButton variant="danger" size="sm">
                Void
              </AppButton>
            </>
          }
        >
          P-02 · Chidera Okoye · expected ₦119,952, declared ₦117,552 — variance{' '}
          <strong className="font-mono" style={{ color: 'var(--oxblood)' }}>
            − ₦2,400.00
          </strong>
          .
        </AppInlineAlert>
        <AppInlineAlert
          tone="over"
          mark="Over"
          action={
            <AppButton variant="ghost" size="sm">
              Accept &amp; close
            </AppButton>
          }
        >
          P-05 · Yusuf Lawal · over{' '}
          <strong className="font-mono" style={{ color: 'var(--amber)' }}>
            + ₦440.00
          </strong>
          . Likely a tip.
        </AppInlineAlert>
        <AppInlineAlert
          tone="info"
          mark="Info"
          action={
            <AppButton variant="ghost" size="sm">
              View receipt
            </AppButton>
          }
        >
          Pump 04 belt replaced at 17:30 by Engr. Yemi. ₦8,500 expense filed.
        </AppInlineAlert>
      </div>
    </div>
  );
}
