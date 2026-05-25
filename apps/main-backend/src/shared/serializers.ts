import type {
  BranchDoc,
  DeliveryDoc,
  DipDoc,
  ExpenseDoc,
  MembershipDoc,
  NoteDoc,
  NotificationDoc,
  OrgDoc,
  PriceDoc,
  PumpDoc,
  RoleDoc,
  ShiftDoc,
  TankDoc,
  UserDoc,
} from '@shared/types/documents.js';

import type { RefMap } from '@features/refs/refs.service.js';

// Map persisted documents to the wire (seam) shape. `_id` becomes `id`; internal-only
// fields (passwordHash) are dropped. This is the only place the doc→response mapping lives,
// so the seam contract is auditable in one file.

// A resolved-ref map → wire shape (snake_case href_kind). Keys are the ids.
export const serializeRefs = (refs: RefMap): Record<string, { type: string; label: string; href_kind: string | null }> => {
  const out: Record<string, { type: string; label: string; href_kind: string | null }> = {};
  for (const [id, ref] of Object.entries(refs)) {
    out[id] = { type: ref.type, label: ref.label, href_kind: ref.hrefKind };
  }
  return out;
};

export const serializeUser = (u: UserDoc) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  email_verified: u.emailVerifiedAt !== null,
  phone_verified: u.phoneVerifiedAt !== null,
  is_active: u.isActive,
  created_at: u.createdAt,
});

export const serializeOrg = (o: OrgDoc) => ({
  id: o._id,
  name: o.name,
  wordmark: o.wordmark,
  owner_id: o.ownerId,
  created_at: o.createdAt,
});

export const serializeRole = (r: RoleDoc) => ({
  id: r._id,
  org_id: r.orgId,
  name: r.name,
  is_system: r.isSystem,
  permissions: r.permissions,
  created_at: r.createdAt,
});

export const serializeMembership = (m: MembershipDoc) => ({
  id: m._id,
  org_id: m.orgId,
  user_id: m.userId,
  branch_id: m.branchId,
  role_id: m.roleId,
  default_pump_id: m.defaultPumpId,
  is_active: m.isActive,
  created_at: m.createdAt,
});

export const serializeBranch = (b: BranchDoc) => ({
  id: b._id,
  org_id: b.orgId,
  name: b.name,
  city: b.city,
  state: b.state,
  is_archived: b.isArchived,
  settings: {
    require_closing_dip: b.settings.requireClosingDip,
    variance_flag_kobo: b.settings.varianceFlagKobo,
    manager_may_set_price: b.settings.managerMaySetPrice,
    delivery_tolerance_litres: b.settings.deliveryToleranceLitres,
  },
});

export const serializeTank = (t: TankDoc) => ({
  id: t._id,
  branch_id: t.branchId,
  product: t.product,
  capacity_litres: t.capacityLitres,
  reorder_threshold_litres: t.reorderThresholdLitres,
  current_litres: t.currentLitres,
});

export const serializePump = (p: PumpDoc) => ({
  id: p._id,
  branch_id: p.branchId,
  product: p.product,
  label: p.label,
  state: p.state,
  fault_note: p.faultNote,
});

export const serializeShift = (s: ShiftDoc) => ({
  id: s._id,
  branch_id: s.branchId,
  pump_id: s.pumpId,
  attendant_id: s.attendantId,
  window: s.window,
  business_date: s.businessDate,
  opening_meter: s.openingMeter,
  closing_meter: s.closingMeter,
  litres: s.litres,
  price_per_litre_kobo: s.pricePerLitreKobo,
  expected_gross_kobo: s.expectedGrossKobo,
  cash_declared_kobo: s.cashDeclaredKobo,
  variance_kobo: s.varianceKobo,
  status: s.status,
  variance_status: s.varianceStatus,
  is_posted: s.status === 'posted',
  is_voided: s.status === 'voided',
  opened_by: s.openedBy,
  opened_at: s.openedAt,
  closed_by: s.closedBy,
  closed_at: s.closedAt,
  posted_by: s.postedBy,
  posted_at: s.postedAt,
  voided_by: s.voidedBy,
  voided_at: s.voidedAt,
  void_reason: s.voidReason,
});

export const serializeDip = (d: DipDoc) => ({
  id: d._id,
  branch_id: d.branchId,
  tank_id: d.tankId,
  product: d.product,
  business_date: d.businessDate,
  kind: d.kind,
  litres: d.litres,
  wet_stock_variance_litres: d.wetStockVarianceLitres,
  recorded_by: d.recordedBy,
  recorded_at: d.createdAt,
});

export const serializeDelivery = (d: DeliveryDoc) => ({
  id: d._id,
  branch_id: d.branchId,
  tank_id: d.tankId,
  product: d.product,
  waybill_number: d.waybillNumber,
  supplier: d.supplier,
  driver_name: d.driverName,
  truck_plate: d.truckPlate,
  witness: d.witness,
  waybill_litres: d.waybillLitres,
  cost_per_litre_kobo: d.costPerLitreKobo,
  dip_before_litres: d.dipBeforeLitres,
  dip_after_litres: d.dipAfterLitres,
  variance_litres: d.varianceLitres,
  stage: d.stage,
  arrived_at: d.arrivedAt,
  signed_by: d.signedBy,
  signed_at: d.signedAt,
});

export const serializePrice = (p: PriceDoc) => ({
  id: p._id,
  branch_id: p.branchId,
  product: p.product,
  price_per_litre_kobo: p.pricePerLitreKobo,
  previous_price_per_litre_kobo: p.previousPricePerLitreKobo,
  effective_at: p.effectiveAt,
  reason: p.reason,
  set_by: p.setBy,
  created_at: p.createdAt,
});

export const serializeExpense = (e: ExpenseDoc) => ({
  id: e._id,
  branch_id: e.branchId,
  business_date: e.businessDate,
  category: e.category,
  description: e.description,
  amount_kobo: e.amountKobo,
  recorded_by: e.recordedBy,
  witness: e.witness,
  is_single_source: e.isSingleSource,
  created_at: e.createdAt,
});

export const serializeNote = (n: NoteDoc) => ({
  id: n._id,
  entity_type: n.entityType,
  entity_id: n.entityId,
  author_id: n.authorId,
  body: n.body,
  mentions: n.mentions,
  created_at: n.createdAt,
});

export const serializeNotification = (n: NotificationDoc) => ({
  id: n._id,
  kind: n.kind,
  title: n.title,
  body: n.body,
  branch_id: n.branchId,
  read: n.readAt !== null,
  created_at: n.createdAt,
});
