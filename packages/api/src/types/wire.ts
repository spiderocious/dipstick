// Wire shapes — the EXACT JSON the backend sends (snake_case, integer kobo, ISO dates,
// prefixed-ULID ids). These mirror docs/api-docs.md. The FE consumes these verbatim; do not
// confuse with the camelCase domain types in @dipstick/core (those describe an idealised seam).

import type { Permission } from '@dipstick/core';

export interface UserWire {
  id: string;
  name: string;
  email: string;
  phone: string | null; // optional at sign-up
  email_verified: boolean;
  phone_verified: boolean;
  is_active: boolean;
  created_at: string;
}

// A channel still awaiting OTP verification (returned by register/login/verify).
export interface PendingChannelWire {
  channel: 'email' | 'phone';
  target: string;
  dev_otp?: string; // only outside production
}

export interface OrgWire {
  id: string;
  name: string;
  wordmark: string | null;
  owner_id: string;
  created_at: string;
}

export interface TokensWire {
  access_token: string;
  refresh_token: string;
}

export interface MembershipWire {
  id: string;
  org_id: string;
  user_id: string;
  branch_id: string; // '*' = org-wide (owner)
  role_id: string;
  default_pump_id: string | null;
  is_active: boolean;
  created_at: string;
  role_name: string;
  permissions: Permission[];
}

export interface MeWire {
  user: UserWire;
  memberships: MembershipWire[];
}

export interface RegisterResultWire {
  user: UserWire;
  org: OrgWire;
  // verification_required=false + tokens present → policy `none` (auto-verified, signed in).
  verification_required: boolean;
  pending: PendingChannelWire[];
  tokens: TokensWire | null;
}

// Returned by login and verify-otp. tokens is null while verification is still pending
// (unverified login, or policy `both` with a channel remaining); `pending` lists what's left.
export interface AuthSessionWire {
  user: UserWire;
  tokens: TokensWire | null;
  verification_required: boolean;
  pending: PendingChannelWire[];
}

export interface PermissionDefWire {
  key: Permission;
  description: string;
}

export interface RoleWire {
  id: string;
  org_id: string;
  name: string;
  is_system: boolean;
  permissions: Permission[];
  created_at: string;
}

export interface BranchSettingsWire {
  require_closing_dip: boolean;
  variance_flag_kobo: number;
  manager_may_set_price: boolean;
  delivery_tolerance_litres: number;
}

export interface BranchWire {
  id: string;
  org_id: string;
  name: string;
  city: string;
  state: string;
  is_archived: boolean;
  settings: BranchSettingsWire;
}

export interface TankWire {
  id: string;
  branch_id: string;
  product: string;
  capacity_litres: number;
  reorder_threshold_litres: number;
  current_litres?: number;
}

export interface PumpWire {
  id: string;
  branch_id: string;
  product: string;
  label: string;
  state: string;
  fault_note: string | null;
}

export interface BranchDetailWire extends BranchWire {
  tanks: TankWire[];
  pumps: PumpWire[];
}

export interface StaffMemberWire extends MembershipWire {
  user: UserWire;
  shift_count_30d: number;
  variance_kobo_30d: number;
}

export interface RosterWire {
  week_start: string;
  assignments: Record<string, string[]>; // userId → 7 windows (Mon..Sun)
}

export interface VarianceLeaderRowWire {
  attendant_id: string;
  variance_kobo: number;
  shift_count: number;
}

export interface ShiftWire {
  id: string;
  branch_id: string;
  pump_id: string;
  attendant_id: string;
  window: string;
  business_date: string;
  opening_meter: number;
  closing_meter: number | null;
  litres: number | null;
  price_per_litre_kobo: number;
  expected_gross_kobo: number | null;
  cash_declared_kobo: number | null;
  variance_kobo: number | null;
  variance_status: string | null;
  status: string;
  is_posted: boolean;
  is_voided: boolean;
  opened_by: string;
  opened_at: string;
  closed_by: string | null;
  closed_at: string | null;
  posted_by: string | null;
  posted_at: string | null;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
}

export interface DipWire {
  id: string;
  tank_id: string;
  product: string;
  business_date: string;
  kind: string;
  litres: number;
  wet_stock_variance_litres: number | null;
  recorded_by: string;
  recorded_at: string;
}

export interface DaybookWire {
  business_date: string;
  shifts: ShiftWire[];
  dips: DipWire[];
  tanks: TankWire[];
}

export interface DeliveryWire {
  id: string;
  branch_id: string;
  tank_id: string;
  product: string;
  waybill_number: string;
  supplier: string;
  driver_name: string;
  truck_plate: string;
  witness: string | null;
  waybill_litres: number;
  cost_per_litre_kobo: number;
  dip_before_litres: number | null;
  dip_after_litres: number | null;
  variance_litres: number | null;
  stage: string;
  arrived_at: string;
  signed_by: string | null;
  signed_at: string | null;
}

export interface PriceWire {
  id: string;
  product: string;
  price_per_litre_kobo: number;
  previous_price_per_litre_kobo: number | null;
  effective_at: string;
  reason: string;
  set_by: string;
  created_at: string;
}

export interface CurrentPriceWire {
  product: string;
  price: PriceWire | null;
}

export interface PricePreviewWire {
  delta_per_litre_kobo: number;
  litres_in_tank: number;
  revaluation_kobo: number;
  current_price_kobo: number | null;
}

export interface ExpenseWire {
  id: string;
  branch_id: string;
  business_date: string;
  category: string;
  description: string;
  amount_kobo: number;
  recorded_by: string;
  witness: string | null;
  is_single_source: boolean;
  created_at: string;
}

export interface RollupBranchWire {
  id: string;
  name: string;
  status: string; // clean | short | reorder
  litres: number;
  gross_kobo: number;
  variance_kobo: number;
  short_count: number;
  tanks_below_reorder: string[];
}

export interface RollupTodoWire {
  kind: string;
  branch_id: string;
  message: string;
}

export interface RollupWire {
  business_date: string;
  lead: string;
  totals: { litres: number; gross_kobo: number; variance_kobo: number };
  branches: RollupBranchWire[];
  todo: RollupTodoWire[];
}

export interface TrendPointWire {
  date: string;
  litres: number;
}

export interface TrendSeriesWire {
  branch_id: string;
  branch_name: string;
  points: TrendPointWire[];
}

export interface TrendsWire {
  from: string;
  to: string;
  series: TrendSeriesWire[];
}

export interface NoteWire {
  id: string;
  entity_type: string;
  entity_id: string;
  author_id: string;
  body: string;
  mentions: string[];
  created_at: string;
}

export interface AuditEntryWire {
  id: string;
  branch_id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  note: string | null;
  at: string;
}

// A resolved id → label (+ navigability). Endpoints that carry opaque ids return a
// `refs: RefMap` (top-level, beside `data`) so the UI shows labels instead of raw ids.
export interface RefWire {
  type:
    | 'user'
    | 'role'
    | 'shift'
    | 'delivery'
    | 'expense'
    | 'pump'
    | 'tank'
    | 'branch'
    | 'membership'
    | 'roster'
    | 'org';
  label: string;
  href_kind: 'user' | 'shift' | 'delivery' | 'branch' | null;
}

export type RefMap = Record<string, RefWire>;

// Per-person staff detail (GET /staff/:userId/detail).
export interface StaffMembershipDetailWire extends MembershipWire {
  branch_name: string | null;
}

export interface StaffMetricsWire {
  shift_count_total: number;
  shift_count_30d: number;
  variance_kobo_30d: number;
}

export interface StaffDetailWire {
  user: UserWire;
  memberships: StaffMembershipDetailWire[];
  metrics: StaffMetricsWire;
  recent_shifts: ShiftWire[];
}

export interface NotificationWire {
  id: string;
  kind: string;
  title: string;
  body: string;
  branch_id: string | null;
  read: boolean;
  created_at: string;
}

// Cursor pagination meta (lists carry this alongside `data`).
export interface PageMeta {
  nextCursor: string | null;
  hasMore: boolean;
}
