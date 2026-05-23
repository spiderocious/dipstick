import { AppAvatar, AppButton, AppPill, AppTooltip, type AppTooltipPlacement } from '@dipstick/ui';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

const PLACEMENTS: readonly AppTooltipPlacement[] = ['top', 'bottom', 'left', 'right'];

export function TooltipPart() {
  return (
    <div>
      <PageHead index="39 / DISPLAY" title="Tooltip" subtitle="AppTooltip from @dipstick/ui" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Tiny ink rectangles for short clarifications — shown on hover and keyboard focus. Hand-rolled, no
        dependency. Pass <code>compact={'{false}'}</code> for a wider hovercard panel.
      </p>

      <RefBlock title="Short labels">
        <RefRow label="on a button">
          <AppTooltip content="Starts the day-book — opens all pumps">
            <AppButton variant="secondary">Open shift</AppButton>
          </AppTooltip>
        </RefRow>
        <RefRow label="on a record id">
          <AppTooltip content="Pump 3 · PMS · Femi Adekunle on shift">
            <span
              className="font-mono text-[11px] uppercase tracking-[0.04em]"
              style={{ color: 'var(--ink-3)', borderBottom: '1px dashed var(--ink-3)', cursor: 'help' }}
            >
              P-03
            </span>
          </AppTooltip>
        </RefRow>
        <RefRow label="info hint">
          <AppTooltip content="Variance is expected minus declared">
            <span
              className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border font-mono text-[9px] font-semibold"
              style={{ borderColor: 'var(--ink-3)', color: 'var(--ink-3)' }}
            >
              i
            </span>
          </AppTooltip>
        </RefRow>
        <RefRow label="on a pill">
          <AppTooltip content="3,200 L left · ~ 4 days at current pace">
            <AppPill tone="watch" dot>
              Reorder soon
            </AppPill>
          </AppTooltip>
        </RefRow>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Placements">
        {PLACEMENTS.map((placement) => (
          <RefRow key={placement} label={placement}>
            <AppTooltip content={`Tooltip ${placement}`} placement={placement}>
              <AppButton variant="ghost" size="sm">
                Hover · {placement}
              </AppButton>
            </AppTooltip>
          </RefRow>
        ))}
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Hovercard — compact={false}">
        <RefRow label="attendant">
          <AppTooltip
            placement="bottom"
            compact={false}
            content={
              <div>
                <div className="mb-2.5 flex items-center gap-2.5 border-b pb-2.5" style={{ borderColor: 'var(--hair)' }}>
                  <AppAvatar name="Femi Adekunle" role="attendant" size="lg" />
                  <div>
                    <div className="font-serif text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>
                      Femi Adekunle
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--ink-3)' }}>
                      Attendant · P-03 · Mokola
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['Shifts (90d)', '28'],
                    ['Variance avg', '₦0'],
                    ['Litres', '22,440 L'],
                    ['Joined', '2024-08-12'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: 'var(--ink-3)' }}>
                        {k}
                      </div>
                      <div className="mt-0.5 font-mono text-[13px] tabular-nums" style={{ color: 'var(--ink)' }}>
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            }
          >
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{ color: 'var(--ink)', borderBottom: '1px solid var(--emerald)', textDecoration: 'none' }}
            >
              Femi Adekunle
            </a>
          </AppTooltip>
        </RefRow>
      </RefBlock>
    </div>
  );
}
