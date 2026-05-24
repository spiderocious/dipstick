import { ERROR_CODE, ERROR_CODE_META, type ErrorCode } from '@shared/constants/error-codes.js';

// AppError carries the flat error contract. The error middleware reads `code`, `message`,
// `status`, `type`, and (for validation) the single offending `field`.
export class AppError extends Error {
  public readonly status: number;
  public readonly retryAfter?: number;
  public readonly field?: string;

  constructor(
    public readonly code: ErrorCode,
    message: string,
    opts: { status?: number; field?: string; retryAfter?: number } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.status = opts.status ?? ERROR_CODE_META[code].httpStatus;
    if (opts.field !== undefined) this.field = opts.field;
    if (opts.retryAfter !== undefined) this.retryAfter = opts.retryAfter;
    Error.captureStackTrace(this, this.constructor);
  }
}

// A validation error always names the ONE field at fault (one error at a time).
export class ValidationError extends AppError {
  constructor(message: string, field: string) {
    super(ERROR_CODE.VALIDATION, message, { field });
    this.name = 'ValidationError';
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required') {
    super(ERROR_CODE.UNAUTHENTICATED, message);
    this.name = 'UnauthenticatedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to do that') {
    super(ERROR_CODE.FORBIDDEN, message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(ERROR_CODE.NOT_FOUND, `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(ERROR_CODE.CONFLICT, message);
    this.name = 'ConflictError';
  }
}

export class InvalidStateError extends AppError {
  constructor(message: string) {
    super(ERROR_CODE.INVALID_STATE, message);
    this.name = 'InvalidStateError';
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(ERROR_CODE.BUSINESS_RULE, message);
    this.name = 'BusinessRuleError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(ERROR_CODE.RATE_LIMITED, message, { retryAfter });
    this.name = 'RateLimitError';
  }
}
