// Routing
export { ROUTES, BRANCH_SEGMENT } from './constants/routes.js';

// Domain literal values (compared/keyed/sent — never inline these in logic)
export {
  PRODUCT,
  PRODUCTS,
  PUMP_STATE,
  SHIFT_WINDOW,
  ROSTER_WINDOWS,
  SHIFT_STATUS,
  VARIANCE_STATUS,
  DIP_KIND,
  DELIVERY_STAGE,
  DELIVERY_STAGE_ORDER,
  EXPENSE_CATEGORY,
  EXPENSE_CATEGORIES,
  BRANCH_STATUS,
  TODO_KIND,
  NOTE_ENTITY,
  NOTIFICATION_KIND,
  VOID_WORD,
  ORG_WIDE_SCOPE,
} from './constants/domain.js';
export type { DipKind, ExpenseCategory, BranchStatus, NoteEntity } from './constants/domain.js';

// Query keys (one source of truth for query + invalidation)
export { QK } from './constants/query-keys.js';

// Error-code → message map + toast mark
export { ERROR_CODE, ERROR_MESSAGE, ERROR_TOAST_MARK } from './copy/error-messages.js';
export type { ErrorCodeValue } from './copy/error-messages.js';

// RBAC — permission catalogue, descriptions, seeded role sets
export { P, ALL_PERMISSIONS, isPermission } from './auth/permissions.js';
export type { Permission } from './auth/permissions.js';
export { PERMISSION_DESCRIPTIONS } from './auth/permission-descriptions.js';
export {
  SYSTEM_ROLE_PERMISSIONS,
  SYSTEM_ROLE_NAMES,
} from './auth/system-roles.js';
export type { SystemRoleName } from './auth/system-roles.js';

// Auth / token storage
export { createTokenStorage, TOKEN_KEYS } from './auth/token-storage.js';
export type { TokenStorage } from './auth/token-storage.js';

// Domain types
export * from './types/index.js';

// Helpers
export { formatNaira, parseNairaToKobo } from './money/format-naira.js';
export type { FormatNairaOptions } from './money/format-naira.js';
export { formatRelative } from './time/format-relative.js';
export { idempotencyKey } from './ids/idempotency-key.js';
