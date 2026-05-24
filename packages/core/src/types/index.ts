// Dipstick domain types — the filling-station logbook. See mvp.md + docs/backend-plan.md.
// These describe the SEAM shape (what crosses the wire): money is integer kobo, ids are
// prefixed-ULID strings, dates are ISO 8601 strings.

import type { Permission } from '../auth/permissions.js';

// Roles are dynamic in v1 (see backend-plan §0). UserRole here is the seeded-role name; a
// branch membership references a roleId, not this union.
export type SystemRoleName = 'Owner' | 'Manager' | 'Attendant';

// The three Nigerian forecourt products in v1.
export type Product = 'PMS' | 'AGO' | 'DPK';

export type PumpState = 'idle' | 'live' | 'offline';

export type ShiftWindow = 'morning' | 'evening' | 'off';

// A reconciliation row is flagged against expected gross.
export type VarianceStatus = 'balanced' | 'short' | 'over';

// A shift's lifecycle.
export type ShiftStatus = 'open' | 'closed' | 'posted' | 'voided';

export type DeliveryStage = 'arrived' | 'dip_before' | 'offloaded' | 'signed';

// `'*'` means org-wide (the owner sees every branch).
export type BranchScope = string | '*';

export interface Org {
  id: string;
  name: string;
  wordmark: string | null;
  ownerId: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  phoneVerifiedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Role {
  id: string;
  orgId: string;
  name: string;
  isSystem: boolean;
  permissions: Permission[];
  createdAt: string;
}

export interface Membership {
  id: string;
  orgId: string;
  userId: string;
  branchId: BranchScope;
  roleId: string;
  defaultPumpId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface BranchSettings {
  requireClosingDip: boolean;
  varianceFlagKobo: number;
  managerMaySetPrice: boolean;
  deliveryToleranceLitres: number;
}

export interface Branch {
  id: string;
  orgId: string;
  name: string;
  city: string;
  state: string;
  isArchived: boolean;
  settings: BranchSettings;
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
  businessDate: string;
  openingMeter: number;
  closingMeter: number | null;
  litres: number | null;
  // Money is kobo end-to-end.
  pricePerLitreKobo: number;
  expectedGrossKobo: number | null;
  cashDeclaredKobo: number | null;
  varianceKobo: number | null;
  status: ShiftStatus;
  postedBy: string | null;
  postedAt: string | null;
}
