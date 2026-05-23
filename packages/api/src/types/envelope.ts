// Mirrors the backend response envelope (lib/response.ts on main-backend).
// Every successful response wraps payload in `{ data: ... }`. Every error
// wraps payload in `{ error: { code, message, field_errors? } }`.

export interface ApiError {
  code: string;
  message: string;
  field_errors?: Record<string, string[]>;
}

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export const parseApiError = (raw: unknown): ApiError => {
  if (raw && typeof raw === 'object' && 'error' in raw) {
    const err = (raw as ApiErrorResponse).error;
    if (err && typeof err.code === 'string') return err;
  }
  return { code: 'unknown', message: 'Something went wrong' };
};
