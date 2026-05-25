import type { ErrorCode, ErrorType } from '../constants/error-codes.js';

// Success envelope: { data, meta? }. `refs` is an optional top-level id→label map (not
// pagination, so it sits beside meta rather than inside it) — used by list endpoints that
// would otherwise return raw ids the UI can't render (audit, activity, …).
export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
  refs?: Record<string, unknown>;
}

// Error envelope is FLAT — no nesting. Always exactly these three fields.
//   { errorCode: 1001, errorMessage: 'Email is invalid', type: 'validation_error' }
// `field` is included for validation errors so the client knows which input to focus;
// it is the single offending field (one error at a time), never a map of many.
export interface ApiErrorBody {
  errorCode: ErrorCode;
  errorMessage: string;
  type: ErrorType;
  field?: string;
}
