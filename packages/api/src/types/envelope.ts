// Mirrors the backend response envelope (main-backend lib/response.ts).
// Success: { data, meta? }. Error is FLAT: { errorCode, errorMessage, type, field? }.
// Clients switch on the numeric `errorCode` (1001–1009), never on errorMessage.

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

// Numeric error codes, matching the backend ERROR_CODE constant.
export const API_ERROR_CODE = {
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

export type ApiErrorCode = (typeof API_ERROR_CODE)[keyof typeof API_ERROR_CODE];

export interface ApiError {
  errorCode: number;
  errorMessage: string;
  type: string;
  // Present on validation errors (1001): the single offending field.
  field?: string;
}

// Parse an unknown thrown/response body into a normalized ApiError. ky throws HTTPError;
// callers can await err.response.json() and pass it here.
export const parseApiError = (raw: unknown): ApiError => {
  if (raw && typeof raw === 'object' && 'errorCode' in raw) {
    const e = raw as Partial<ApiError>;
    if (typeof e.errorCode === 'number' && typeof e.errorMessage === 'string') {
      return {
        errorCode: e.errorCode,
        errorMessage: e.errorMessage,
        type: typeof e.type === 'string' ? e.type : 'server_error',
        ...(typeof e.field === 'string' ? { field: e.field } : {}),
      };
    }
  }
  return { errorCode: API_ERROR_CODE.INTERNAL, errorMessage: 'Something went wrong', type: 'internal_error' };
};
