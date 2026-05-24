// Domain literal values — every string that is COMPARED, KEYED ON, or SENT TO THE API as an
// enum value. Logic must never inline these; reference the POJO. (Human-readable copy is a
// separate concern and may be literal in components — see each feature's *.copy.ts.)

import type { DeliveryStage, Product, ShiftWindow } from '../types/index.js';

// The three Nigerian forecourt products.
export const PRODUCT = {
  PMS: 'PMS',
  AGO: 'AGO',
  DPK: 'DPK',
} as const;
export const PRODUCTS: readonly Product[] = [PRODUCT.PMS, PRODUCT.AGO, PRODUCT.DPK];

// Pump lifecycle.
export const PUMP_STATE = {
  IDLE: 'idle',
  LIVE: 'live',
  OFFLINE: 'offline',
} as const;

// Shift window (and the roster slot).
export const SHIFT_WINDOW = {
  MORNING: 'morning',
  EVENING: 'evening',
  OFF: 'off',
} as const;
export const ROSTER_WINDOWS: readonly ShiftWindow[] = [
  SHIFT_WINDOW.MORNING,
  SHIFT_WINDOW.EVENING,
  SHIFT_WINDOW.OFF,
];

// Shift lifecycle.
export const SHIFT_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  POSTED: 'posted',
  VOIDED: 'voided',
} as const;

// Reconciliation flag.
export const VARIANCE_STATUS = {
  BALANCED: 'balanced',
  SHORT: 'short',
  OVER: 'over',
} as const;

// Dip kind (opening carries forward; closing computes wet-stock variance).
export const DIP_KIND = {
  OPENING: 'opening',
  CLOSING: 'closing',
} as const;
export type DipKind = (typeof DIP_KIND)[keyof typeof DIP_KIND];

// Tanker offload stages (the guided four-step flow).
export const DELIVERY_STAGE = {
  ARRIVED: 'arrived',
  DIP_BEFORE: 'dip_before',
  OFFLOADED: 'offloaded',
  SIGNED: 'signed',
} as const;
export const DELIVERY_STAGE_ORDER: readonly DeliveryStage[] = [
  DELIVERY_STAGE.ARRIVED,
  DELIVERY_STAGE.DIP_BEFORE,
  DELIVERY_STAGE.OFFLOADED,
  DELIVERY_STAGE.SIGNED,
];

// Expense categories (Module 5).
export const EXPENSE_CATEGORY = {
  GENERATOR_DIESEL: 'generator_diesel',
  MAINTENANCE: 'maintenance',
  UNION_DUES: 'union_dues',
  FORECOURT_SUNDRY: 'forecourt_sundry',
  CASH_ADVANCE: 'cash_advance',
  OTHER: 'other',
} as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORY)[keyof typeof EXPENSE_CATEGORY];
export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = Object.values(EXPENSE_CATEGORY);

// Per-branch status pill on the roll-up.
export const BRANCH_STATUS = {
  CLEAN: 'clean',
  SHORT: 'short',
  REORDER: 'reorder',
} as const;
export type BranchStatus = (typeof BRANCH_STATUS)[keyof typeof BRANCH_STATUS];

// Roll-up "things to do" item kinds.
export const TODO_KIND = {
  SHORTAGE: 'shortage',
  REORDER: 'reorder',
  PRICE: 'price',
  CALL: 'call',
} as const;

// Note entity types (the /:entityType/:entityId/notes route).
export const NOTE_ENTITY = {
  SHIFT: 'shift',
  EXPENSE: 'expense',
  DELIVERY: 'delivery',
} as const;
export type NoteEntity = (typeof NOTE_ENTITY)[keyof typeof NOTE_ENTITY];

// Notification kinds (Module 10, in-app).
export const NOTIFICATION_KIND = {
  SHIFT_POSTED: 'shift.posted',
  TANK_REORDER: 'tank.reorder',
  SHORTAGE_FLAGGED: 'shortage.flagged',
  PRICE_PENDING: 'price.pending',
  DELIVERY_CONFIRMED: 'delivery.confirmed',
  SYSTEM: 'system',
} as const;

// The literal word the VOID idiom requires the user to type.
export const VOID_WORD = 'VOID' as const;

// Org-wide membership marker (the owner's branch scope).
export const ORG_WIDE_SCOPE = '*' as const;
