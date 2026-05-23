import { formatNaira } from '@dipstick/core';

import { PageHead, SectionBreak } from './preview-canvas.tsx';

interface LedgerRow {
  readonly pump: string;
  readonly litres: number;
  readonly grossKobo: number;
  readonly declaredKobo: number;
}

const ROWS: readonly LedgerRow[] = [
  { pump: 'Pump 1 · PMS', litres: 4280, grossKobo: 0, declaredKobo: 0 },
  { pump: 'Pump 2 · PMS', litres: 3915, grossKobo: 0, declaredKobo: 0 },
  { pump: 'Pump 3 · AGO', litres: 1240, grossKobo: 0, declaredKobo: 0 },
];

const PRICE_KOBO = 70000; // ₦700.00 / litre

function rowFigures(row: LedgerRow) {
  const grossKobo = row.litres * PRICE_KOBO;
  // Pump 3 runs short by ₦4,200 to exercise the oxblood treatment.
  const declaredKobo = row.pump.startsWith('Pump 3') ? grossKobo - 420000 : grossKobo;
  const varianceKobo = declaredKobo - grossKobo;
  return { grossKobo, declaredKobo, varianceKobo };
}

export function FiguresPart() {
  return (
    <div>
      <PageHead index="03 / FOUNDATION" title="Figures" subtitle="tabular numerals · the ledger column" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Every litre, naira and meter is monospace with <code>tabular-nums</code> so columns line up like a
        cashier's book. Money is stored in kobo and formatted through <code>formatNaira()</code> from{' '}
        <code>@dipstick/core</code>.
      </p>

      <SectionBreak label="Reconciliation rows" />

      <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--sheet-edge)' }}>
        <div
          className="grid items-center px-5 py-3 font-sans font-semibold uppercase"
          style={{
            gridTemplateColumns: '1.4fr 1fr 1.2fr 1.2fr 1.2fr',
            fontSize: '10px',
            letterSpacing: '0.14em',
            color: 'var(--ink-3)',
            background: 'var(--recessed)',
          }}
        >
          <span>Pump</span>
          <span className="text-right">Litres</span>
          <span className="text-right">Expected</span>
          <span className="text-right">Declared</span>
          <span className="text-right">Variance</span>
        </div>
        {ROWS.map((row) => {
          const { grossKobo, declaredKobo, varianceKobo } = rowFigures(row);
          const short = varianceKobo < 0;
          return (
            <div
              key={row.pump}
              className="grid items-center px-5 py-3"
              style={{
                gridTemplateColumns: '1.4fr 1fr 1.2fr 1.2fr 1.2fr',
                borderTop: '1px solid var(--hair-soft)',
                background: 'var(--sheet)',
              }}
            >
              <span className="font-sans text-[13px]" style={{ color: 'var(--ink)' }}>
                {row.pump}
              </span>
              <span
                className="text-right font-mono text-[13px]"
                style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}
              >
                {row.litres.toLocaleString('en-NG')}
              </span>
              <span
                className="text-right font-mono text-[13px]"
                style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-2)' }}
              >
                {formatNaira(grossKobo)}
              </span>
              <span
                className="text-right font-mono text-[13px]"
                style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-2)' }}
              >
                {formatNaira(declaredKobo)}
              </span>
              <span
                className="text-right font-mono text-[13px]"
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  color: short ? 'var(--oxblood)' : 'var(--emerald)',
                  fontWeight: 600,
                }}
              >
                {short ? formatNaira(varianceKobo) : '₦0.00'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
