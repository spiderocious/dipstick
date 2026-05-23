import { AppAvatar, AppPill, AppPulse, type AppAvatarRole, type AppAvatarSize } from '@dipstick/ui';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

const SIZES: readonly AppAvatarSize[] = ['sm', 'md', 'lg', 'xl'];
const ROLES: readonly AppAvatarRole[] = ['owner', 'manager', 'attendant'];

const STAFF = [
  { name: 'Segun Olaitan', role: 'owner', sub: 'Owner · 3 branches', shift: '—', live: false, pill: 'Owner' },
  { name: 'Adeola Bakare', role: 'manager', sub: 'Manager · Mokola', shift: '14:00 — 22:00', live: true, pill: 'On shift' },
  { name: 'Femi Adekunle', role: 'attendant', sub: 'Attendant · P-03', shift: '14:00 — 22:00', live: false, pill: 'On shift' },
  { name: 'Chidera Okoye', role: 'attendant', sub: 'Attendant · P-02', shift: '14:00 — 22:00', live: false, pill: 'Shortage flag' },
] as const;

export function AvatarPart() {
  return (
    <div>
      <PageHead index="32 / DISPLAY" title="Avatar" subtitle="AppAvatar · AppPulse from @dipstick/ui" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Initials on paper-toned circles — three role tints, never random. Owner is ink, manager emerald,
        attendant paper. <code>AppPulse</code> marks a shift currently on.
      </p>

      <RefBlock title="In a scene — staff row">
        <div className="w-full">
          {STAFF.map((s) => (
            <div
              key={s.name}
              className="grid items-center gap-4 py-3"
              style={{ gridTemplateColumns: '40px 1fr 120px 24px 110px', borderTop: '1px solid var(--hair)' }}
            >
              <AppAvatar name={s.name} role={s.role} />
              <div>
                <div className="font-serif" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>
                  {s.name}
                </div>
                <div className="font-mono uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em', color: 'var(--ink-3)' }}>
                  {s.sub}
                </div>
              </div>
              <span className="text-right font-mono text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>
                {s.shift}
              </span>
              <span className="flex justify-center">{s.live ? <AppPulse label="On shift" /> : null}</span>
              <span className="flex justify-end">
                {s.pill === 'Shortage flag' ? (
                  <AppPill tone="short" dot>
                    {s.pill}
                  </AppPill>
                ) : s.pill === 'Owner' ? (
                  <AppPill tone="ink">{s.pill}</AppPill>
                ) : (
                  <AppPill tone="ok" dot>
                    {s.pill}
                  </AppPill>
                )}
              </span>
            </div>
          ))}
        </div>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Sizes">
        <RefRow label="sm · md · lg · xl">
          {SIZES.map((size) => (
            <AppAvatar key={size} name="Femi Adekunle" size={size} />
          ))}
        </RefRow>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Roles">
        {ROLES.map((role) => (
          <RefRow key={role} label={role}>
            <AppAvatar name="Segun Olaitan" role={role} />
          </RefRow>
        ))}
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Pulse">
        <RefRow label="live shift">
          <AppPulse label="On shift" />
          <span className="font-mono text-[12px]" style={{ color: 'var(--ink-3)' }}>
            shift currently on
          </span>
        </RefRow>
      </RefBlock>
    </div>
  );
}
