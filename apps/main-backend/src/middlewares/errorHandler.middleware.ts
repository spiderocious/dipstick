import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { AppError } from '@lib/errors.js';
import { requestContext } from '@lib/http/requestContext.js';
import { logger } from '@lib/logger.js';
import { ResponseUtil } from '@lib/response.js';
import { ERROR_CODE } from '@shared/constants/error-codes.js';

// Reduce a raw ZodError to a single field + message (mirrors lib/validate.ts so that a
// route that called Schema.parse() directly still yields one-error-at-a-time output).
const firstZodIssue = (err: ZodError): { field: string; message: string } => {
  const issue = err.issues[0];
  if (!issue) return { field: '_root', message: 'Validation failed' };
  const field = issue.path.length === 0 ? '_root' : issue.path.map(String).join('.');
  return { field, message: issue.message };
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const requestId = requestContext.getRequestId();

  if (err instanceof AppError) {
    if (err.status >= 500) logger.error({ err, requestId }, err.message);
    if (err.retryAfter !== undefined) res.setHeader('Retry-After', err.retryAfter);
    ResponseUtil.error(res, err.code, err.message, {
      status: err.status,
      ...(err.field !== undefined ? { field: err.field } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    const { field, message } = firstZodIssue(err);
    ResponseUtil.error(res, ERROR_CODE.VALIDATION, message, { field });
    return;
  }

  // Extreme / irreconcilable — never leak internals. 1009.
  logger.error({ err, requestId }, 'Unhandled error');
  ResponseUtil.error(res, ERROR_CODE.INTERNAL, 'An unexpected error occurred');
};
