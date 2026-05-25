// Centralised route table. Apps import from here so route strings have exactly one source
// of truth. Branch-scoped surfaces live under /branches/:branchId/* so the selected branch
// is always in the URL (bookmarkable, and the param drives branch-scoped data + permissions).
// Parametric routes are functions; static ones are strings.
export const ROUTES = {
  // Public marketing
  HOME: '/',
  PRICING: '/pricing',
  ABOUT: '/about',

  // Auth (no shell)
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY: '/verify',

  // Owner roll-up — the authed landing (Module 7)
  DASHBOARD: '/dashboard',

  // Branches list + create (Module 1)
  BRANCHES: '/branches',

  // Branch-scoped surfaces (everything that belongs to one branch)
  BRANCH: (branchId: string) => `/branches/${branchId}`,
  BRANCH_DAYBOOK: (branchId: string) => `/branches/${branchId}/daybook`,
  BRANCH_SHIFT: (branchId: string, shiftId: string) =>
    `/branches/${branchId}/shifts/${shiftId}`,
  BRANCH_DELIVERIES: (branchId: string) => `/branches/${branchId}/deliveries`,
  BRANCH_DELIVERY: (branchId: string, deliveryId: string) =>
    `/branches/${branchId}/deliveries/${deliveryId}`,
  BRANCH_PRICING: (branchId: string) => `/branches/${branchId}/pricing`,
  BRANCH_EXPENSES: (branchId: string) => `/branches/${branchId}/expenses`,
  BRANCH_STAFF: (branchId: string) => `/branches/${branchId}/staff`,
  BRANCH_STAFF_MEMBER: (branchId: string, userId: string) =>
    `/branches/${branchId}/staff/${userId}`,
  BRANCH_ROSTER: (branchId: string) => `/branches/${branchId}/roster`,
  BRANCH_AUDIT: (branchId: string) => `/branches/${branchId}/audit`,

  // Org-level settings (Module 1 / account)
  SETTINGS: '/settings',
  SETTINGS_ROLES: '/settings/roles',
  SETTINGS_ORG: '/settings/org',

  // Notifications feed (Module 10)
  NOTIFICATIONS: '/notifications',

  // Design-system preview (dev-facing)
  PREVIEW: '/preview',
} as const;

// Relative path segments — used when composing nested <Route> trees under a branch layout.
// The parent path is ROUTES.BRANCH(':branchId'); children mount at these segments.
export const BRANCH_SEGMENT = {
  ROOT: '',
  DAYBOOK: 'daybook',
  SHIFT: 'shifts/:shiftId',
  DELIVERIES: 'deliveries',
  DELIVERY: 'deliveries/:deliveryId',
  PRICING: 'pricing',
  EXPENSES: 'expenses',
  STAFF: 'staff',
  STAFF_MEMBER: 'staff/:userId',
  ROSTER: 'roster',
  AUDIT: 'audit',
} as const;
