import { randomBytes } from 'node:crypto';

// Sufficient for request IDs and idempotency keys. Not for tokens.
export const newRawId = (): string => randomBytes(12).toString('hex');
