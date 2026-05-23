// Dipstick domain types — the filling-station logbook. See mvp.md.

// Roles are fixed in v1. The owner wins ties.
export type UserRole = 'owner' | 'manager' | 'attendant';

// The three Nigerian forecourt products in v1.
export type Product = 'PMS' | 'AGO' | 'DPK';

export type PumpState = 'idle' | 'live' | 'offline';

export type ShiftWindow = 'morning' | 'evening';

// A reconciliation row is flagged against expected gross.
export type VarianceStatus = 'balanced' | 'short' | 'over';

export interface Branch {
  id: string;
  name: string;
  city: string;
  state: string;
  isArchived: boolean;
}

export interface Tank {
  id: string;
  branchId: string;
  product: Product;
  capacityLitres: number;
  reorderThresholdLitres: number;
}

export interface Pump {
  id: string;
  branchId: string;
  product: Product;
  state: PumpState;
  faultNote: string | null;
}

export interface Shift {
  id: string;
  branchId: string;
  pumpId: string;
  attendantId: string;
  window: ShiftWindow;
  openingMeter: number;
  closingMeter: number | null;
  // Money is kobo end-to-end.
  pricePerLitreKobo: number;
  cashDeclaredKobo: number | null;
  varianceKobo: number;
  status: VarianceStatus;
  isPosted: boolean;
  isVoided: boolean;
}
