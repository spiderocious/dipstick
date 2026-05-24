import type { ErrorCode, ErrorType } from '../constants/error-codes.js';

// Success envelope is unchanged: { data, meta? }.
export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
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
