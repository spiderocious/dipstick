import type { ClientSession } from 'mongodb';

import { logger } from '@lib/logger.js';

import { getClient } from './client.js';

// A unit of work. Services that perform multi-document atomic writes (post shift + audit;
// sign delivery + update tank) call withTransaction and pass `ctx.session` to repos.
//
// DB-portability note: the `Tx` shape we expose to services is deliberately minimal — an
// opaque `session`. When this swaps to SQL, `Tx` becomes a transaction handle and repos
// take it the same way. Services do not know it is a Mongo ClientSession.
export interface Tx {
  session: ClientSession;
}

// Mongo multi-document transactions require a replica set. On a standalone dev Mongo,
// starting a transaction throws; we degrade to running the body without one so local dev
// and single-node CI work. Production runs against a replica set and gets true atomicity.
export const withTransaction = async <T>(fn: (tx: Tx) => Promise<T>): Promise<T> => {
  const client = getClient();
  const session = client.startSession();
  try {
    let result: T;
    try {
      await session.withTransaction(async () => {
        result = await fn({ session });
      });
      // result is assigned inside withTransaction's callback before it resolves.
      return result!;
    } catch (err) {
      if (isTransactionsUnsupported(err)) {
        logger.warn('mongo transactions unsupported (standalone) — running without a session');
        return fn({ session });
      }
      throw err;
    }
  } finally {
    await session.endSession();
  }
};

const isTransactionsUnsupported = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return false;
  const message = 'message' in err ? String((err as { message: unknown }).message) : '';
  const code = 'code' in err ? (err as { code: unknown }).code : undefined;
  return (
    message.includes('Transaction numbers are only allowed on a replica set') ||
    message.includes('Transactions are not supported') ||
    code === 20 ||
    code === 263
  );
};
