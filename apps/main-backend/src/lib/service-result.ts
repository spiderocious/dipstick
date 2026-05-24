import type { ErrorCode } from '@shared/constants/error-codes.js';

import type { MessageKey } from './messages.js';

// Services never throw for expected failures and never see HTTP. They return a
// ServiceResult<T>; the controller maps it to ResponseUtil. `field` is set for the
// validation case so the controller can surface the single offending field.
export type ServiceResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      errorCode: ErrorCode;
      messageKey: MessageKey;
      field?: string;
      httpStatus?: number;
      // Seconds the client should wait before retrying — surfaced as the Retry-After header
      // on rate-limit (1008) responses that flow through the ServiceResult path.
      retryAfter?: number;
    };

export const ok = <T>(data: T): ServiceResult<T> => ({ success: true, data });

export const fail = (
  errorCode: ErrorCode,
  messageKey: MessageKey,
  opts: { field?: string; httpStatus?: number; retryAfter?: number } = {},
): ServiceResult<never> => ({
  success: false,
  errorCode,
  messageKey,
  ...(opts.field !== undefined ? { field: opts.field } : {}),
  ...(opts.httpStatus !== undefined ? { httpStatus: opts.httpStatus } : {}),
  ...(opts.retryAfter !== undefined ? { retryAfter: opts.retryAfter } : {}),
});
