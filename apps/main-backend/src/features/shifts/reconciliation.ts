import type { VarianceStatus } from '@dipstick/core';

// Pure reconciliation maths. All integer kobo — no float drift. Tested in isolation.
//
//   litres          = closingMeter - openingMeter           (litres, may be fractional)
//   expectedGross   = round(litres * pricePerLitreKobo)     (kobo, integer)
//   variance        = expectedGross - cashDeclared          (kobo; >0 short, <0 over, 0 balanced)
//
// "Short" means the till is missing money the meter says was sold. "Over" means more cash
// than the meter accounts for. Sign convention matches the staff variance track-record
// (a short shift accumulates positive shortage).

export interface Reconciliation {
  litres: number;
  expectedGrossKobo: number;
  varianceKobo: number;
  varianceStatus: VarianceStatus;
}

export const reconcile = (
  openingMeter: number,
  closingMeter: number,
  pricePerLitreKobo: number,
  cashDeclaredKobo: number,
): Reconciliation => {
  const litres = closingMeter - openingMeter;
  const expectedGrossKobo = Math.round(litres * pricePerLitreKobo);
  const varianceKobo = expectedGrossKobo - cashDeclaredKobo;
  const varianceStatus: VarianceStatus =
    varianceKobo === 0 ? 'balanced' : varianceKobo > 0 ? 'short' : 'over';
  return { litres, expectedGrossKobo, varianceKobo, varianceStatus };
};
