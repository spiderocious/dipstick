import { useState } from 'react';

import { AppSwitch } from '@dipstick/ui';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

interface SettingRowProps {
  readonly title: string;
  readonly note: string;
  readonly checked: boolean;
  readonly onChange: (next: boolean) => void;
}

function SettingRow({ title, note, checked, onChange }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-6 py-1">
      <div>
        <div className="font-serif" style={{ fontSize: '15px', color: 'var(--ink)' }}>
          {title}
        </div>
        <div className="font-mono uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em', color: 'var(--ink-3)' }}>
          {note}
        </div>
      </div>
      <AppSwitch checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

export function SwitchPart() {
  const [settings, setSettings] = useState({ dip: true, autoFlag: true, managerPrice: false });

  return (
    <div>
      <PageHead index="15 / PRIMITIVES" title="Switch" subtitle="AppSwitch from @dipstick/ui" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Off is a recessed track with an ink knob; on fills emerald and the knob goes sheet. Used for
        settings — never for a destructive action.
      </p>

      <RefBlock title="In a scene — branch settings · Mokola">
        <div className="flex w-full flex-col gap-3">
          <SettingRow
            title="Require closing dip before posting"
            note="A shift with no dip cannot be signed off."
            checked={settings.dip}
            onChange={(v) => setSettings((s) => ({ ...s, dip: v }))}
          />
          <hr style={{ border: 0, borderTop: '1px solid var(--hair-soft)' }} />
          <SettingRow
            title="Auto-flag variance over ₦5,000"
            note="Raises a watch-flag to owner on roll-up."
            checked={settings.autoFlag}
            onChange={(v) => setSettings((s) => ({ ...s, autoFlag: v }))}
          />
          <hr style={{ border: 0, borderTop: '1px solid var(--hair-soft)' }} />
          <SettingRow
            title="Allow manager to change pump price"
            note="Owner-only by default."
            checked={settings.managerPrice}
            onChange={(v) => setSettings((s) => ({ ...s, managerPrice: v }))}
          />
        </div>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="States">
        <RefRow label="off">
          <AppSwitch label="Off" defaultChecked={false} />
        </RefRow>
        <RefRow label="on">
          <AppSwitch label="On" defaultChecked />
        </RefRow>
        <RefRow label="disabled">
          <AppSwitch label="Disabled" disabled />
        </RefRow>
        <RefRow label="disabled · on">
          <AppSwitch label="Disabled on" disabled defaultChecked />
        </RefRow>
      </RefBlock>
    </div>
  );
}
