import { PageHead, SectionBreak } from './preview-canvas.tsx';

interface SwatchProps {
  readonly bg: string;
  readonly name: string;
  readonly role: string;
  readonly hex: string;
}

function Swatch({ bg, name, role, hex }: SwatchProps) {
  return (
    <div className="rounded-[16px] overflow-hidden" style={{ border: '1px solid var(--sheet-edge)' }}>
      <div className="h-[110px]" style={{ background: bg, borderBottom: '1px solid var(--sheet-edge)' }} />
      <div className="p-4" style={{ background: 'var(--sheet)' }}>
        <div
          className="font-serif font-medium"
          style={{ fontSize: '16px', letterSpacing: '-0.01em', color: 'var(--ink)' }}
        >
          {name}
        </div>
        <div className="mt-1 text-[12px]" style={{ color: 'var(--ink-3)' }}>
          {role}
        </div>
        <div className="mt-1.5 font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
          {hex}
        </div>
      </div>
    </div>
  );
}

interface StateChipProps {
  readonly bg: string;
  readonly edge: string;
  readonly fg: string;
  readonly label: string;
  readonly copy: string;
}

function StateChip({ bg, edge, fg, label, copy }: StateChipProps) {
  return (
    <div className="rounded-[14px] p-5" style={{ background: bg, color: fg, border: `1px solid ${edge}` }}>
      <div className="font-sans font-bold uppercase text-[11px] tracking-[0.14em] mb-2">{label}</div>
      <div
        className="font-serif font-medium italic"
        style={{ fontSize: '16px', lineHeight: '1.4', letterSpacing: '-0.01em' }}
      >
        {copy}
      </div>
    </div>
  );
}

export function PalettePart() {
  return (
    <div>
      <PageHead index="01 / FOUNDATION" title="Palette" subtitle="warm cream · warm ink · one deep-emerald accent" />

      <p className="mb-8 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        One accent. <strong style={{ color: 'var(--ink)' }}>#0E5C3A</strong> carries every confirmed,
        balanced, posted state and the brand mark. The paper is warm cream, the ink is warm near-black —
        never pure white, never pure black. Oxblood is reserved for shortage and the void idiom; amber for
        watch / over / out-of-spec; ink-blue for system notes.
      </p>

      <SectionBreak label="Canvas & surfaces" />

      <div className="grid grid-cols-2 gap-6 mb-2">
        <Swatch bg="var(--paper)" name="Paper" role="The canvas. Every screen sits on this." hex="#F2EDE2" />
        <Swatch bg="var(--sheet)" name="Sheet" role="A single card on the canvas." hex="#FBF7EC" />
        <Swatch bg="var(--recessed)" name="Recessed" role="Behind a card." hex="#ECE5D4" />
        <Swatch bg="var(--ink)" name="Ink" role="Body & headlines. Never pure black." hex="#1A1714" />
      </div>

      <SectionBreak label="Emerald · the single accent" />

      <div className="grid grid-cols-2 gap-6">
        <Swatch bg="var(--emerald)" name="Emerald" role="Posted · balanced · brand mark." hex="#0E5C3A" />
        <Swatch bg="var(--emerald-hover)" name="Emerald · hover" role="Pressed / hover state." hex="#0A4A2E" />
      </div>

      <SectionBreak label="State · used sparingly" />

      <div className="grid grid-cols-3 gap-4">
        <StateChip
          bg="var(--oxblood-bg)"
          edge="var(--oxblood)"
          fg="var(--oxblood)"
          label="Shortage · void"
          copy="₦4,200 short on Pump 3. Type VOID to reverse a posted shift."
        />
        <StateChip
          bg="var(--amber-bg)"
          edge="var(--amber)"
          fg="var(--amber)"
          label="Watch · over"
          copy="Delivery variance +260 L — beyond the ±200 L tolerance."
        />
        <StateChip
          bg="var(--info-bg)"
          edge="var(--info)"
          fg="var(--info)"
          label="System · info"
          copy="Nightly backup completed at 02:00. Closing dip required before posting."
        />
      </div>
    </div>
  );
}
