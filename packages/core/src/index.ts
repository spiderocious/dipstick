// Routing
export { ROUTES } from './constants/routes.js';

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
