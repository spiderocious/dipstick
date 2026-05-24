// Flat numeric error contract (1001–1009). Every error response is the flat shape
// { errorCode, errorMessage, type } — never a nested envelope. Clients switch on the
// numeric `errorCode`; `type` is a coarse category for logging/branching; `errorMessage`
// is human-facing and may change (do not key off it).
//
// 1001 — payload validation (one field at a time; see lib/validate.ts)
// 1002 — authentication failure (missing/invalid/expired token, bad credentials)
// 1003 — authorization failure (authenticated but lacks permission / wrong branch)
// 1004 — resource not found
// 1005 — conflict (duplicate, state already exists, concurrent update)
// 1006 — invalid state transition (e.g. close a shift that isn't open, void unposted)
// 1007 — business-rule violation (branch rule unmet, closing < opening, last-owner)
// 1008 — rate limited / too many requests
// 1009 — extreme / irreconcilable / unexpected server error (the catch-all 500)

export const ERROR_CODE = {
  VALIDATION: 1001,
  UNAUTHENTICATED: 1002,
  FORBIDDEN: 1003,
  NOT_FOUND: 1004,
  CONFLICT: 1005,
  INVALID_STATE: 1006,
  BUSINESS_RULE: 1007,
  RATE_LIMITED: 1008,
  INTERNAL: 1009,
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

// Coarse machine `type`. Maps from the numeric code; lets clients/logs branch without a
// switch over every numeric value.
export const ERROR_TYPE = {
  VALIDATION: 'validation_error',
  AUTH: 'auth_error',
  FORBIDDEN: 'forbidden_error',
  NOT_FOUND: 'not_found_error',
  CONFLICT: 'conflict_error',
  STATE: 'state_error',
  BUSINESS: 'business_error',
  RATE_LIMIT: 'rate_limit_error',
  SERVER: 'server_error',
  INTERNAL: 'internal_error',
} as const;

export type ErrorType = (typeof ERROR_TYPE)[keyof typeof ERROR_TYPE];

// Default HTTP status + `type` for each numeric code. A handler may override the HTTP
// status (e.g. a conflict that should be 422) but the numeric code is the contract.
export const ERROR_CODE_META: Record<
  ErrorCode,
  { httpStatus: number; type: ErrorType }
> = {
  [ERROR_CODE.VALIDATION]: { httpStatus: 400, type: ERROR_TYPE.VALIDATION },
  [ERROR_CODE.UNAUTHENTICATED]: { httpStatus: 401, type: ERROR_TYPE.AUTH },
  [ERROR_CODE.FORBIDDEN]: { httpStatus: 403, type: ERROR_TYPE.FORBIDDEN },
  [ERROR_CODE.NOT_FOUND]: { httpStatus: 404, type: ERROR_TYPE.NOT_FOUND },
  [ERROR_CODE.CONFLICT]: { httpStatus: 409, type: ERROR_TYPE.CONFLICT },
  [ERROR_CODE.INVALID_STATE]: { httpStatus: 409, type: ERROR_TYPE.STATE },
  [ERROR_CODE.BUSINESS_RULE]: { httpStatus: 422, type: ERROR_TYPE.BUSINESS },
  [ERROR_CODE.RATE_LIMITED]: { httpStatus: 429, type: ERROR_TYPE.RATE_LIMIT },
  [ERROR_CODE.INTERNAL]: { httpStatus: 500, type: ERROR_TYPE.INTERNAL },
};
