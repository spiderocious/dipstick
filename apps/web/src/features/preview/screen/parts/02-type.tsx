import { PageHead, SectionBreak } from './preview-canvas.tsx';

interface SpecimenProps {
  readonly family: string;
  readonly role: string;
  readonly sample: string;
  readonly style: React.CSSProperties;
}

function Specimen({ family, role, sample, style }: SpecimenProps) {
  return (
    <div className="py-5" style={{ borderBottom: '1px solid var(--hair-soft)' }}>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
          {family}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
          {role}
        </span>
      </div>
      <div style={{ color: 'var(--ink)', ...style }}>{sample}</div>
    </div>
  );
}

export function TypePart() {
  return (
    <div>
      <PageHead
        index="02 / FOUNDATION"
        title="Typography"
        subtitle="Source Serif 4 · Inter · IBM Plex Mono"
      />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Three families, each with a job. Serif for display and the names of people & places. Inter for
        body, chrome, labels and buttons. <strong style={{ color: 'var(--ink)' }}>IBM Plex Mono</strong>{' '}
        for every figure and every record id — always with tabular numerals.
      </p>

      <SectionBreak label="Source Serif 4 · display & names" />
      <Specimen
        family="serif / 600"
        role="display-1"
        sample="Ikeja Filling Station"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '40px', letterSpacing: '-0.02em' }}
      />
      <Specimen
        family="serif / 500"
        role="heading-1"
        sample="Morning roll-up — 23 May"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '28px' }}
      />

      <SectionBreak label="Inter · body & chrome" />
      <Specimen
        family="sans / 400"
        role="body"
        sample="Record the closing meter and the cash declared; variance computes live as you type."
        style={{ fontFamily: 'var(--font-body)', fontSize: '16px', lineHeight: 1.6 }}
      />
      <Specimen
        family="sans / 600"
        role="caption"
        sample="ATTENDANT · PUMP 3 · EVENING SHIFT"
        style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.14em' }}
      />

      <SectionBreak label="IBM Plex Mono · figures & ids" />
      <Specimen
        family="mono / tabular"
        role="figures"
        sample="₦1,284,500.00   ·   12,480 L   ·   meter 084,221"
        style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: '20px' }}
      />
      <Specimen
        family="mono / 500"
        role="record id"
        sample="shift_8f2a · waybill WB-44871 · brn_demo_ikeja"
        style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '14px', color: 'var(--ink-3)' }}
      />
    </div>
  );
}
