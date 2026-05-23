import type { ErrorCode } from '../constants/error-codes.js';

export interface ApiError {
  code: ErrorCode;
  message: string;
  field_errors?: Record<string, string[]>;
}

export interface ApiEnvelope<T> {
  data?: T;
  error?: ApiError;
  meta?: Record<string, unknown>;
}
