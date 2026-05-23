import {
  IconAudit,
  IconBranch,
  IconChart,
  IconDaybook,
  IconExpense,
  IconFuel,
  IconGauge,
  IconPrice,
  IconStaff,
  IconTruck,
} from '@icons';

import { PageHead } from './preview-canvas.tsx';

const ICONS = [
  { Icon: IconBranch, label: 'Branch' },
  { Icon: IconGauge, label: 'Dip / tank' },
  { Icon: IconFuel, label: 'Pump' },
  { Icon: IconDaybook, label: 'Day-book' },
  { Icon: IconTruck, label: 'Delivery' },
  { Icon: IconExpense, label: 'Expense' },
  { Icon: IconPrice, label: 'Pricing' },
  { Icon: IconStaff, label: 'Staff' },
  { Icon: IconChart, label: 'Roll-up' },
  { Icon: IconAudit, label: 'Audit' },
] as const;

export function IconsPart() {
  return (
    <div>
      <PageHead index="04 / FOUNDATION" title="Icons" subtitle="imported from @icons — the swappable proxy" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Feature code imports from <code>@icons</code>, never from <code>lucide-react</code> directly. The
        proxy lives in <code>packages/ui/src/icons/index.ts</code>, so the icon source swaps in one file.
      </p>

      <div className="grid grid-cols-5 gap-4">
        {ICONS.map(({ Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center gap-3 rounded-[14px] py-7"
            style={{ background: 'var(--sheet)', border: '1px solid var(--sheet-edge)' }}
          >
            <Icon size={24} color="var(--emerald)" aria-hidden="true" />
            <span className="font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
