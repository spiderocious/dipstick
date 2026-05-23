import { useState } from 'react';

import { AppRadio, AppRadioGroup } from '@dipstick/ui';

import { PageHead, RefBlock } from './preview-canvas.tsx';

const ATTENDANTS = [
  { id: 'femi', name: 'Femi Adekunle', rec: 'P-03 · ON SHIFT' },
  { id: 'chidera', name: 'Chidera Okoye', rec: 'P-02 · ON SHIFT' },
  { id: 'aisha', name: 'Aisha Bello', rec: 'P-01 · ON SHIFT' },
] as const;

function RecBadge({ children }: { readonly children: string }) {
  return (
    <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.04em]" style={{ color: 'var(--ink-3)' }}>
      {children}
    </span>
  );
}

export function RadioPart() {
  const [attendant, setAttendant] = useState('femi');

  return (
    <div>
      <PageHead index="14 / PRIMITIVES" title="Radio" subtitle="AppRadio · AppRadioGroup from @dipstick/ui" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Single choice. Unchecked is an ink-outline ring; checked shows an emerald dot.{' '}
        <code>AppRadioGroup</code> owns the <code>name</code> and the controlled value.
      </p>

      <RefBlock title="In a scene — who closed the shift?">
        <AppRadioGroup name="attendant" value={attendant} onValueChange={setAttendant}>
          {ATTENDANTS.map((a) => (
            <AppRadio
              key={a.id}
              value={a.id}
              label={
                <span>
                  {a.name}
                  <RecBadge>{a.rec}</RecBadge>
                </span>
              }
            />
          ))}
          <AppRadio
            value="add"
            label={<span style={{ color: 'var(--ink-3)' }}>+ Add an attendant not listed</span>}
          />
        </AppRadioGroup>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="States">
        <AppRadioGroup name="states" value="b">
          <AppRadio value="a" label="Unselected" />
          <AppRadio value="b" label="Selected" />
          <AppRadio value="c" label="Disabled" disabled />
          <AppRadio value="b-disabled" label="Disabled (n/a here)" disabled />
        </AppRadioGroup>
      </RefBlock>
    </div>
  );
}
