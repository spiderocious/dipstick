import type { Permission } from '@dipstick/core';
import type {
  BranchScope,
  BranchSettings,
  DeliveryStage,
  Product,
  PumpState,
  ShiftStatus,
  ShiftWindow,
  VarianceStatus,
} from '@dipstick/core';

// Persisted document shapes. `_id` is our prefixed-ULID string (never a Mongo ObjectId).
// These are the repo-facing types; services consume them, repos read/write them. The wire
// (seam) types live in @dipstick/core and are mapped from these by serializers.

interface BaseDoc {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserDoc extends BaseDoc {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  phoneVerifiedAt: string | null;
  isActive: boolean;
}

export interface OrgDoc extends BaseDoc {
  name: string;
  wordmark: string | null;
  ownerId: string;
}

export interface RoleDoc extends BaseDoc {
  orgId: string;
  name: string;
  isSystem: boolean;
  permissions: Permission[];
}

export interface MembershipDoc extends BaseDoc {
  orgId: string;
  userId: string;
  branchId: BranchScope;
  roleId: string;
  defaultPumpId: string | null;
  isActive: boolean;
}

export interface BranchDoc extends BaseDoc {
  orgId: string;
  name: string;
  city: string;
  state: string;
  isArchived: boolean;
  archivedAt: string | null;
  settings: BranchSettings;
}

export interface TankDoc extends BaseDoc {
  orgId: string;
  branchId: string;
  product: Product;
  capacityLitres: number;
  reorderThresholdLitres: number;
  currentLitres: number;
}

export interface PumpDoc extends BaseDoc {
  orgId: string;
  branchId: string;
  product: Product;
  label: string;
  state: PumpState;
  faultNote: string | null;
}

export interface RosterDoc extends BaseDoc {
  orgId: string;
  branchId: string;
  weekStart: string; // ISO date (Monday)
  // attendantId -> 7 windows (Mon..Sun)
  assignments: Record<string, ShiftWindow[]>;
}

export interface ShiftDoc extends BaseDoc {
  orgId: string;
  branchId: string;
  pumpId: string;
  attendantId: string;
  window: ShiftWindow;
  businessDate: string;
  openingMeter: number;
  closingMeter: number | null;
  litres: number | null;
  pricePerLitreKobo: number;
  expectedGrossKobo: number | null;
  cashDeclaredKobo: number | null;
  varianceKobo: number | null;
  varianceStatus: VarianceStatus | null;
  status: ShiftStatus;
  openedBy: string;
  openedAt: string;
  closedBy: string | null;
  closedAt: string | null;
  postedBy: string | null;
  postedAt: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
}

export type DipKind = 'opening' | 'closing';

export interface DipDoc extends BaseDoc {
  orgId: string;
  branchId: string;
  tankId: string;
  product: Product;
  businessDate: string;
  kind: DipKind;
  litres: number;
  wetStockVarianceLitres: number | null;
  recordedBy: string;
}

export interface DeliveryDoc extends BaseDoc {
  orgId: string;
  branchId: string;
  tankId: string;
  product: Product;
  waybillNumber: string;
  supplier: string;
  driverName: string;
  truckPlate: string;
  witness: string | null;
  waybillLitres: number;
  costPerLitreKobo: number;
  dipBeforeLitres: number | null;
  dipAfterLitres: number | null;
  varianceLitres: number | null;
  stage: DeliveryStage;
  arrivedAt: string;
  signedBy: string | null;
  signedAt: string | null;
  recordedBy: string;
}

export interface PriceDoc extends BaseDoc {
  orgId: string;
  branchId: string;
  product: Product;
  pricePerLitreKobo: number;
  previousPricePerLitreKobo: number | null;
  effectiveAt: string;
  reason: string;
  setBy: string;
}

export interface ExpenseDoc extends BaseDoc {
  orgId: string;
  branchId: string;
  businessDate: string;
  category: string;
  description: string;
  amountKobo: number;
  recordedBy: string;
  witness: string | null;
  isSingleSource: boolean;
}

export type NoteEntityType = 'shift' | 'expense' | 'delivery';

export interface NoteDoc extends BaseDoc {
  orgId: string;
  branchId: string;
  entityType: NoteEntityType;
  entityId: string;
  authorId: string;
  body: string;
  mentions: string[];
}

export interface NotificationDoc extends BaseDoc {
  orgId: string;
  userId: string;
  kind: string;
  title: string;
  body: string;
  branchId: string | null;
  readAt: string | null;
}

export interface AuditDoc {
  _id: string;
  orgId: string;
  branchId: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  note: string | null;
  at: string;
}

export interface OtpDoc {
  _id: string;
  phone: string;
  userId: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: string;
}

export interface SessionDoc {
  _id: string;
  userId: string;
  orgId: string;
  expiresAt: Date;
  createdAt: string;
  revokedAt: string | null;
}
