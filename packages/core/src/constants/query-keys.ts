// React Query cache keys. Centralised so a query and its invalidation reference the same key
// (drift here is a classic silent cache bug). Each is a function returning a readonly tuple.

export const QK = {
  me: () => ['me'] as const,
  permissions: () => ['permissions'] as const,
  roles: () => ['roles'] as const,

  branches: () => ['branches'] as const,
  branch: (branchId: string) => ['branch', branchId] as const,

  daybook: (branchId: string, date: string) => ['daybook', branchId, date] as const,
  shift: (shiftId: string) => ['shift', shiftId] as const,

  deliveries: (branchId: string) => ['deliveries', branchId] as const,
  delivery: (deliveryId: string) => ['delivery', deliveryId] as const,

  prices: (branchId: string) => ['prices', branchId] as const,
  priceHistory: (branchId: string, product: string) =>
    ['price-history', branchId, product] as const,

  expenses: (branchId: string, category: string) => ['expenses', branchId, category] as const,
  expense: (expenseId: string) => ['expense', expenseId] as const,

  staff: (branchId: string) => ['staff', branchId] as const,
  staffDetail: (userId: string) => ['staff-detail', userId] as const,
  staffActivity: (userId: string) => ['staff-activity', userId] as const,
  roster: (branchId: string, weekStart: string) => ['roster', branchId, weekStart] as const,
  varianceLeaderboard: (branchId: string) => ['variance-leaderboard', branchId] as const,

  rollup: (date: string) => ['rollup', date] as const,
  rollupTrends: (days: number) => ['rollup-trends', days] as const,

  notes: (entityType: string, entityId: string) => ['notes', entityType, entityId] as const,
  audit: (branchId: string) => ['audit', branchId] as const,

  notifications: () => ['notifications'] as const,
} as const;
