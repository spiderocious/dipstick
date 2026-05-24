// Single source of truth for backend URL paths. Apps reach the server through
// the named constants here so a rename touches one line, not dozens.
export const EP = {
  HEALTH: 'api/v1/health',

  AUTH_LOGIN: 'api/v1/auth/login',
  AUTH_REGISTER: 'api/v1/auth/register',
  AUTH_REFRESH: 'api/v1/auth/refresh',
  AUTH_LOGOUT: 'api/v1/auth/logout',
  AUTH_VERIFY_OTP: 'api/v1/auth/verify-otp',
  AUTH_RESEND_OTP: 'api/v1/auth/resend-otp',
  AUTH_ME: 'api/v1/me',
  ORG: 'api/v1/org',

  // RBAC
  PERMISSIONS: 'api/v1/permissions',
  ROLES: 'api/v1/roles',
  ROLE: (id: string) => `api/v1/roles/${id}`,

  // Module 1 — Branches, tanks, pumps, staff
  BRANCHES: 'api/v1/branches',
  BRANCH: (id: string) => `api/v1/branches/${id}`,
  BRANCH_TANKS: (branchId: string) => `api/v1/branches/${branchId}/tanks`,
  BRANCH_PUMPS: (branchId: string) => `api/v1/branches/${branchId}/pumps`,
  BRANCH_ARCHIVE: (branchId: string) => `api/v1/branches/${branchId}/archive`,
  BRANCH_TANK: (branchId: string, tankId: string) =>
    `api/v1/branches/${branchId}/tanks/${tankId}`,
  BRANCH_PUMP: (branchId: string, pumpId: string) =>
    `api/v1/branches/${branchId}/pumps/${pumpId}`,
  STAFF: (branchId: string) => `api/v1/branches/${branchId}/staff`,
  STAFF_MEMBER: (membershipId: string) => `api/v1/staff/${membershipId}`,
  ROSTER: (branchId: string) => `api/v1/branches/${branchId}/roster`,
  VARIANCE_LEADERBOARD: (branchId: string) =>
    `api/v1/branches/${branchId}/variance-leaderboard`,

  // Module 2 — The day & shifts
  DAYBOOK: (branchId: string) => `api/v1/branches/${branchId}/daybook`,
  SHIFTS: (branchId: string) => `api/v1/branches/${branchId}/shifts`,
  SHIFTS_POST_BALANCED: (branchId: string) =>
    `api/v1/branches/${branchId}/shifts/post-balanced`,
  SHIFT: (id: string) => `api/v1/shifts/${id}`,
  SHIFT_POST: (id: string) => `api/v1/shifts/${id}/post`,
  SHIFT_VOID: (id: string) => `api/v1/shifts/${id}/void`,
  DIPS: (branchId: string) => `api/v1/branches/${branchId}/dips`,

  // Module 3 — Deliveries
  DELIVERIES: (branchId: string) => `api/v1/branches/${branchId}/deliveries`,
  DELIVERY: (id: string) => `api/v1/deliveries/${id}`,
  DELIVERY_SIGN: (id: string) => `api/v1/deliveries/${id}/sign`,

  // Module 4 — Pricing
  PRICES: (branchId: string) => `api/v1/branches/${branchId}/prices`,
  PRICE_PREVIEW: (branchId: string) => `api/v1/branches/${branchId}/prices/preview`,
  PRICE_HISTORY: (branchId: string, product: string) =>
    `api/v1/branches/${branchId}/prices/${product}/history`,

  // Module 5 — Expenses
  EXPENSES: (branchId: string) => `api/v1/branches/${branchId}/expenses`,
  EXPENSE: (id: string) => `api/v1/expenses/${id}`,

  // Module 7 — Owner roll-up
  ROLLUP: 'api/v1/rollup',
  ROLLUP_TRENDS: 'api/v1/rollup/trends',

  // Module 9 — Notes & audit
  NOTES: (entityType: string, entityId: string) =>
    `api/v1/${entityType}/${entityId}/notes`,
  AUDIT: (branchId: string) => `api/v1/branches/${branchId}/audit`,

  // Module 10 — Notifications
  NOTIFICATIONS: 'api/v1/notifications',
  NOTIFICATION_READ: (id: string) => `api/v1/notifications/${id}/read`,
} as const;
