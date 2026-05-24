// The permission catalogue. Frozen POJO of permission keys. Lives in `core` so both the
// backend (authorization) and the frontend (UI gating + the role builder) key off the same
// strings. Never inline a permission string anywhere — reference P.*.

export const P = {
  // Org & branches (Module 1)
  CAN_MANAGE_ORG: 'org.manage',
  CAN_CREATE_BRANCH: 'branch.create',
  CAN_EDIT_BRANCH: 'branch.edit',
  CAN_ARCHIVE_BRANCH: 'branch.archive',
  CAN_VIEW_BRANCH: 'branch.view',
  CAN_MANAGE_TANKS: 'tank.manage',
  CAN_MANAGE_PUMPS: 'pump.manage',

  // Staff & roles (Module 1)
  CAN_VIEW_STAFF: 'staff.view',
  CAN_MANAGE_STAFF: 'staff.manage',
  CAN_MANAGE_ROSTER: 'roster.manage',
  CAN_MANAGE_ROLES: 'role.manage',
  CAN_ASSIGN_ROLES: 'role.assign',

  // Day & shifts (Module 2)
  CAN_RECORD_DIP: 'dip.record',
  CAN_OPEN_SHIFT: 'shift.open',
  CAN_CLOSE_OWN_SHIFT: 'shift.close.own',
  CAN_CLOSE_ANY_SHIFT: 'shift.close.any',
  CAN_POST_SHIFT: 'shift.post',
  CAN_VOID_SHIFT: 'shift.void',
  CAN_EDIT_POSTED: 'posted.edit',
  CAN_VIEW_RECONCILIATION: 'reconciliation.view',

  // Deliveries (Module 3)
  CAN_RECORD_DELIVERY: 'delivery.record',
  CAN_SIGN_DELIVERY: 'delivery.sign',

  // Pricing (Module 4)
  CAN_SET_PRICE: 'price.set',
  CAN_VIEW_PRICE_HISTORY: 'price.history.view',

  // Expenses (Module 5)
  CAN_RECORD_EXPENSE: 'expense.record',
  CAN_VIEW_EXPENSES: 'expense.view',

  // Roll-up & reports (Module 7)
  CAN_VIEW_ROLLUP: 'rollup.view',
  CAN_EXPORT_REPORTS: 'report.export',

  // Notes & audit (Module 9)
  CAN_ADD_NOTE: 'note.add',
  CAN_VIEW_AUDIT: 'audit.view',
} as const;

export type Permission = (typeof P)[keyof typeof P];

// All permission values, for validation (a custom role may only hold known permissions).
export const ALL_PERMISSIONS: readonly Permission[] = Object.values(P);

const PERMISSION_SET = new Set<string>(ALL_PERMISSIONS);

export const isPermission = (value: string): value is Permission => PERMISSION_SET.has(value);
