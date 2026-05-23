import {
  AppPill,
  AppProductMark,
  AppSheet,
  AppTable,
  AppTbody,
  AppTd,
  AppTfoot,
  AppTh,
  AppThead,
  AppTr,
} from '@dipstick/ui';
import type { Product } from '@dipstick/core';

import { PageHead } from './preview-canvas.tsx';

interface Row {
  readonly name: string;
  readonly pump: string;
  readonly product: Product;
  readonly litres: string;
  readonly price: string;
  readonly expected: string;
  readonly declared: string;
  readonly variance: string;
  readonly tone?: 'ok' | 'short' | 'over';
  readonly status: 'balanced' | 'short' | 'over' | 'voided';
}

const ROWS: readonly Row[] = [
  { name: 'Aisha Bello', pump: 'P-01', product: 'PMS', litres: '502.00', price: '196.00', expected: '98,392.00', declared: '98,392.00', variance: '+ 0.00', tone: 'ok', status: 'balanced' },
  { name: 'Chidera Okoye', pump: 'P-02', product: 'PMS', litres: '612.00', price: '196.00', expected: '119,952.00', declared: '117,552.00', variance: '− 2,400.00', tone: 'short', status: 'short' },
  { name: 'Femi Adekunle', pump: 'P-03', product: 'PMS', litres: '814.00', price: '196.00', expected: '159,544.00', declared: '159,544.00', variance: '+ 0.00', tone: 'ok', status: 'balanced' },
  { name: 'Yusuf Lawal', pump: 'P-05', product: 'AGO', litres: '412.00', price: '880.00', expected: '362,560.00', declared: '363,000.00', variance: '+ 440.00', tone: 'over', status: 'over' },
  { name: 'Tunde Salami', pump: 'P-04', product: 'PMS', litres: '203.00', price: '196.00', expected: '39,788.00', declared: '39,788.00', variance: '+ 0.00', status: 'voided' },
];

function StatusCell({ status }: { readonly status: Row['status'] }) {
  if (status === 'voided') {
    return (
      <span
        className="inline-block rounded-[2px] border px-1.5 py-px font-mono text-[10px] tracking-[0.1em] no-underline"
        style={{ color: 'var(--oxblood)', borderColor: 'var(--oxblood)' }}
      >
        VOIDED
      </span>
    );
  }
  if (status === 'short')
    return (
      <AppPill tone="short" dot>
        Short
      </AppPill>
    );
  if (status === 'over')
    return (
      <AppPill tone="watch" dot>
        Over
      </AppPill>
    );
  return (
    <AppPill tone="ok" dot>
      Balanced
    </AppPill>
  );
}

export function TablePart() {
  return (
    <div>
      <PageHead index="36 / DISPLAY" title="Table" subtitle="AppTable family from @dipstick/ui" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Headers are uppercase mono; the body alternates serif (names) and mono (numbers). Totals are
        double-ruled. Voided rows are struck through but kept visible — never deleted from sight.
      </p>

      <AppSheet pad="lg">
        <AppTable>
          <AppThead>
            <AppTr className="hover:bg-transparent">
              <AppTh>Attendant · pump</AppTh>
              <AppTh>Product</AppTh>
              <AppTh numeric>Litres</AppTh>
              <AppTh numeric>Price / L</AppTh>
              <AppTh numeric>Expected</AppTh>
              <AppTh numeric>Declared</AppTh>
              <AppTh numeric>Variance</AppTh>
              <AppTh>Status</AppTh>
            </AppTr>
          </AppThead>
          <AppTbody>
            {ROWS.map((r) => (
              <AppTr key={r.pump} voided={r.status === 'voided'}>
                <AppTd variant="name">
                  {r.name}
                  <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.04em]" style={{ color: 'var(--ink-3)' }}>
                    {r.pump}
                  </span>
                </AppTd>
                <AppTd>
                  <AppProductMark product={r.product} />
                </AppTd>
                <AppTd variant="numeric">{r.litres}</AppTd>
                <AppTd variant="numeric">{r.price}</AppTd>
                <AppTd variant="numeric">{r.expected}</AppTd>
                <AppTd variant="numeric">{r.declared}</AppTd>
                <AppTd variant="numeric" tone={r.tone}>
                  {r.variance}
                </AppTd>
                <AppTd>
                  <StatusCell status={r.status} />
                </AppTd>
              </AppTr>
            ))}
          </AppTbody>
          <AppTfoot>
            <AppTr className="hover:bg-transparent">
              <AppTd variant="name" foot colSpan={2}>
                Evening total — 4 active
              </AppTd>
              <AppTd variant="numeric" foot>
                2,340.00
              </AppTd>
              <AppTd foot />
              <AppTd variant="numeric" foot>
                740,448.00
              </AppTd>
              <AppTd variant="numeric" foot>
                738,488.00
              </AppTd>
              <AppTd variant="numeric" foot tone="short">
                − 1,960.00
              </AppTd>
              <AppTd variant="rec" foot>
                2 OPEN · 2 POSTED · 1 VOID
              </AppTd>
            </AppTr>
          </AppTfoot>
        </AppTable>
      </AppSheet>
    </div>
  );
}
