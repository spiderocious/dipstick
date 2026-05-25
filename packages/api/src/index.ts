// Client + endpoints + error envelope
export { apiClient, configureApiClient, createApiClient } from './client.js';
export { EP } from './endpoints.js';
export type { ApiError, ApiErrorCode, ApiResponse } from './types/envelope.js';
export { API_ERROR_CODE, parseApiError } from './types/envelope.js';

// Wire shapes (exact JSON the backend sends) + request payloads
export type * from './types/wire.js';
export type * from './types/payloads.js';

// Hooks — health
export { useHealth } from './hooks/use-health.js';

// Hooks — auth & account
export {
  useMe,
  useRegister,
  useVerifyOtp,
  useResendOtp,
  useLogin,
  useLogout,
  useUpdateOrg,
  clearTokens,
  hasSession,
} from './hooks/use-auth.js';

// Hooks — RBAC
export {
  usePermissions,
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from './hooks/use-rbac.js';

// Hooks — branches, tanks, pumps
export {
  useBranches,
  useBranch,
  useCreateBranch,
  useUpdateBranch,
  useArchiveBranch,
  useAddTank,
  useUpdateTank,
  useAddPump,
  useUpdatePump,
} from './hooks/use-branches.js';

// Hooks — staff & roster
export {
  useStaff,
  useAddStaff,
  useUpdateStaff,
  useRoster,
  useSaveRoster,
  useVarianceLeaderboard,
  useStaffDetail,
  useStaffActivity,
  useAssignBranch,
  useResetPassword,
  useEditAccount,
} from './hooks/use-staff.js';

// Hooks — day, shifts, dips
export {
  useDaybook,
  useShift,
  useRecordDip,
  useOpenShift,
  useCloseShift,
  usePostShift,
  usePostBalanced,
  useVoidShift,
} from './hooks/use-shifts.js';

// Hooks — deliveries
export {
  useDeliveries,
  useDelivery,
  useRecordDelivery,
  useStepDelivery,
  useSignDelivery,
} from './hooks/use-deliveries.js';

// Hooks — pricing
export {
  usePrices,
  usePriceHistory,
  usePricePreview,
  useSetPrice,
} from './hooks/use-pricing.js';

// Hooks — expenses
export { useExpenses, useExpense, useRecordExpense } from './hooks/use-expenses.js';

// Hooks — roll-up & trends
export { useRollup, useRollupTrends } from './hooks/use-rollup.js';

// Hooks — notes & audit
export { useNotes, useAddNote, useAudit } from './hooks/use-notes-audit.js';

// Hooks — notifications
export { useNotifications, useMarkNotificationRead } from './hooks/use-notifications.js';
