export const ERROR_CODES = [
  'validation_error',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'internal',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
