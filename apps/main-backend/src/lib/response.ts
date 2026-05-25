import type { Response } from 'express';

import { ERROR_CODE_META, type ErrorCode } from '@shared/constants/error-codes.js';
import type { ApiEnvelope, ApiErrorBody } from '@shared/types/envelope.types.js';

export class ResponseUtil {
  static ok<T>(res: Response, data: T, meta?: Record<string, unknown>): Response {
    const body: ApiEnvelope<T> = meta ? { data, meta } : { data };
    return res.status(200).json(body);
  }

  // Like ok(), but also attaches a top-level `refs` id→label map (see ApiEnvelope). Used by
  // list endpoints (audit, activity) that carry opaque ids the UI resolves via refs.
  static okWithRefs<T>(
    res: Response,
    data: T,
    refs: Record<string, unknown>,
    meta?: Record<string, unknown>,
  ): Response {
    const body: ApiEnvelope<T> = { data, ...(meta ? { meta } : {}), refs };
    return res.status(200).json(body);
  }

  static created<T>(res: Response, data: T): Response {
    return res.status(201).json({ data } satisfies ApiEnvelope<T>);
  }

  static accepted<T>(res: Response, data: T): Response {
    return res.status(202).json({ data } satisfies ApiEnvelope<T>);
  }

  static noContent(res: Response): Response {
    return res.status(204).end();
  }

  // Flat error shape. `status` defaults from the code's metadata but may be overridden.
  // `retryAfter` (seconds) sets the Retry-After header — used for rate-limit responses.
  static error(
    res: Response,
    code: ErrorCode,
    message: string,
    opts: { status?: number; field?: string; retryAfter?: number } = {},
  ): Response {
    const meta = ERROR_CODE_META[code];
    if (opts.retryAfter !== undefined) res.setHeader('Retry-After', opts.retryAfter);
    const body: ApiErrorBody = {
      errorCode: code,
      errorMessage: message,
      type: meta.type,
      ...(opts.field !== undefined ? { field: opts.field } : {}),
    };
    return res.status(opts.status ?? meta.httpStatus).json(body);
  }
}
