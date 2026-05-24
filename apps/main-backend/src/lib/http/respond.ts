import type { Response } from 'express';

import { messages } from '@lib/messages.js';
import { ResponseUtil } from '@lib/response.js';
import type { ServiceResult } from '@lib/service-result.js';

// Bridges a ServiceResult to the HTTP envelope. Controllers call this instead of
// interpreting failure themselves — they never decide *why* something failed, only map it.
export const sendResult = <T>(
  res: Response,
  result: ServiceResult<T>,
  onSuccess: (res: Response, data: T) => Response = ResponseUtil.ok,
): Response => {
  if (result.success) return onSuccess(res, result.data);
  return ResponseUtil.error(res, result.errorCode, messages.get(result.messageKey), {
    ...(result.field !== undefined ? { field: result.field } : {}),
    ...(result.httpStatus !== undefined ? { status: result.httpStatus } : {}),
  });
};
