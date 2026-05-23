// Single source of truth for backend URL paths. Apps reach the server through
// the named constants here so a rename touches one line, not dozens.
export const EP = {
  HEALTH: 'api/v1/health',

  AUTH_LOGIN: 'api/v1/auth/login',
  AUTH_REGISTER: 'api/v1/auth/register',
  AUTH_REFRESH: 'api/v1/auth/refresh',
  AUTH_LOGOUT: 'api/v1/auth/logout',
  AUTH_VERIFY_OTP: 'api/v1/auth/verify-otp',
  AUTH_ME: 'api/v1/me',

  // Module 1 — Branches, tanks, pumps, staff
  BRANCHES: 'api/v1/branches',
  BRANCH: (id: string) => `api/v1/branches/${id}`,
  BRANCH_TANKS: (branchId: string) => `api/v1/branches/${branchId}/tanks`,
  BRANCH_PUMPS: (branchId: string) => `api/v1/branches/${branchId}/pumps`,
  STAFF: 'api/v1/staff',
  STAFF_MEMBER: (id: string) => `api/v1/staff/${id}`,

  // Module 2 — The day & shifts
  DAYBOOK: (branchId: string) => `api/v1/branches/${branchId}/daybook`,
  SHIFTS: 'api/v1/shifts',
  SHIFT: (id: string) => `api/v1/shifts/${id}`,
  SHIFT_POST: (id: string) => `api/v1/shifts/${id}/post`,
  SHIFT_VOID: (id: string) => `api/v1/shifts/${id}/void`,
  DIPS: (branchId: string) => `api/v1/branches/${branchId}/dips`,

  // Module 3 — Deliveries
  DELIVERIES: 'api/v1/deliveries',
  DELIVERY: (id: string) => `api/v1/deliveries/${id}`,
  DELIVERY_SIGN: (id: string) => `api/v1/deliveries/${id}/sign`,

  // Module 4 — Pricing
  PRICES: 'api/v1/prices',
  PRICE_HISTORY: (product: string) => `api/v1/prices/${product}/history`,

  // Module 5 — Expenses
  EXPENSES: 'api/v1/expenses',
  EXPENSE: (id: string) => `api/v1/expenses/${id}`,

  // Module 7 — Owner roll-up
  ROLLUP: 'api/v1/rollup',

  // Module 9 — Audit log
  AUDIT: 'api/v1/audit',
} as const;
