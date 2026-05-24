// Maps the backend's numeric error contract (1001–1009, see main-backend error-codes.ts and
// packages/api API_ERROR_CODE) to default user-facing copy. The FE switches on the numeric
// `errorCode`, never on the server message. A specific `field` validation message from the
// server is preferred when present; this map is the fallback / summary used for the toast.
//
// core depends on nothing, so the codes are mirrored here as a plain numeric POJO rather than
// imported from @dipstick/api. Keep in sync with API_ERROR_CODE.

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

export type ErrorCodeValue = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

// Default summary copy per code — used for the error toast and as a fallback when the server
// omits a field-specific message.
export const ERROR_MESSAGE: Record<ErrorCodeValue, string> = {
  [ERROR_CODE.VALIDATION]: 'Please check the highlighted field.',
  [ERROR_CODE.UNAUTHENTICATED]: 'Your session has expired. Please sign in again.',
  [ERROR_CODE.FORBIDDEN]: 'You don’t have permission to do that.',
  [ERROR_CODE.NOT_FOUND]: 'We couldn’t find that record.',
  [ERROR_CODE.CONFLICT]: 'That already exists.',
  [ERROR_CODE.INVALID_STATE]: 'That action isn’t allowed in the current state.',
  [ERROR_CODE.BUSINESS_RULE]: 'That breaks a branch rule and can’t be saved.',
  [ERROR_CODE.RATE_LIMITED]: 'Too many attempts. Please wait a moment and try again.',
  [ERROR_CODE.INTERNAL]: 'Something went wrong on our end. Please try again.',
};

// The short uppercase mono mark shown on the error toast (the design-system idiom).
export const ERROR_TOAST_MARK = '✕ ERROR' as const;
