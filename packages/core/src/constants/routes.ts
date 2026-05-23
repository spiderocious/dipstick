// Centralised route table. Apps import from here so route strings have
// exactly one source of truth across web + website surfaces.
export const ROUTES = {
  // Public marketing
  HOME: '/',
  PRICING: '/pricing',
  ABOUT: '/about',

  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY: '/verify',
  FORGOT_PASSWORD: '/forgot-password',

  // Owner roll-up (Module 7)
  DASHBOARD: '/dashboard',

  // Branches, tanks, pumps (Module 1)
  BRANCHES: '/branches',
  BRANCH: (branchId: string) => `/branches/${branchId}`,

  // The day-book & shifts (Module 2)
  DAYBOOK: '/daybook',
  BRANCH_DAYBOOK: (branchId: string) => `/branches/${branchId}/daybook`,
  SHIFT: (shiftId: string) => `/shifts/${shiftId}`,

  // Deliveries (Module 3)
  DELIVERIES: '/deliveries',
  DELIVERY: (deliveryId: string) => `/deliveries/${deliveryId}`,

  // Pricing (Module 4)
  PRICING_LOG: '/pricing',

  // Expenses (Module 5)
  EXPENSES: '/expenses',

  // Staff & roster (Module 1)
  STAFF: '/staff',

  // Audit log (Module 9)
  AUDIT: '/audit',

  // Design-system preview (dev-facing)
  PREVIEW: '/preview',
} as const;
