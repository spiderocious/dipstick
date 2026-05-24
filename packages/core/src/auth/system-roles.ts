import { ALL_PERMISSIONS, P, type Permission } from './permissions.js';

// The three roles seeded for every new org. They are EDITABLE after seeding (system roles
// can have their permissions changed; only their deletion is blocked). These sets are the
// starting points — the spec's defaults — not a permanent matrix.

export type SystemRoleName = 'Owner' | 'Manager' | 'Attendant';

// Owner holds everything (the "owner wins ties" role).
const OWNER: readonly Permission[] = ALL_PERMISSIONS;

// Manager runs a branch day-to-day: everything except org-level + role administration.
const MANAGER: readonly Permission[] = [
  P.CAN_VIEW_BRANCH,
  P.CAN_EDIT_BRANCH,
  P.CAN_MANAGE_TANKS,
  P.CAN_MANAGE_PUMPS,
  P.CAN_VIEW_STAFF,
  P.CAN_MANAGE_STAFF,
  P.CAN_MANAGE_ROSTER,
  P.CAN_ASSIGN_ROLES,
  P.CAN_RECORD_DIP,
  P.CAN_OPEN_SHIFT,
  P.CAN_CLOSE_ANY_SHIFT,
  P.CAN_POST_SHIFT,
  P.CAN_VOID_SHIFT,
  P.CAN_EDIT_POSTED,
  P.CAN_VIEW_RECONCILIATION,
  P.CAN_RECORD_DELIVERY,
  P.CAN_SIGN_DELIVERY,
  P.CAN_SET_PRICE,
  P.CAN_VIEW_PRICE_HISTORY,
  P.CAN_RECORD_EXPENSE,
  P.CAN_VIEW_EXPENSES,
  P.CAN_ADD_NOTE,
  P.CAN_VIEW_AUDIT,
];

// Attendant: close their own pump, file notes, record their own expenses, see their branch.
const ATTENDANT: readonly Permission[] = [
  P.CAN_VIEW_BRANCH,
  P.CAN_CLOSE_OWN_SHIFT,
  P.CAN_RECORD_EXPENSE,
  P.CAN_ADD_NOTE,
];

export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRoleName, readonly Permission[]> = {
  Owner: OWNER,
  Manager: MANAGER,
  Attendant: ATTENDANT,
};

export const SYSTEM_ROLE_NAMES: readonly SystemRoleName[] = ['Owner', 'Manager', 'Attendant'];
