import type { ClientSession } from 'mongodb';

import { logger } from '@lib/logger.js';

import { getClient } from './client.js';

// A unit of work. Services that perform multi-document atomic writes (post shift + audit;
// sign delivery + update tank) call withTransaction and pass `tx` to repos.
//
// DB-portability note: the `Tx` shape we expose to services is deliberately minimal — an
// opaque, OPTIONAL session. When this swaps to SQL, `Tx` becomes a transaction handle and
// repos take it the same way. Services do not know it is a Mongo ClientSession.
//
// `session` is optional: on a standalone Mongo (no replica set) we run the unit of work
// WITHOUT a session, so repos must omit the session when it is absent (see `sessionOpts`).
export interface Tx {
  session?: ClientSession;
}

// Mongo multi-document transactions require a replica set. We detect support once (lazily,
// on first use) and cache it. On a standalone server we skip the transaction entirely and
// run the body session-free — so the unsupported path is never exercised per request, and
// no session is ever attached to a standalone write.
let transactionsSupported: boolean | null = null;

export const withTransaction = async <T>(fn: (tx: Tx) => Promise<T>): Promise<T> => {
  const client = getClient();

  // Known-standalone: run without a transaction or session.
  if (transactionsSupported === false) {
    return fn({});
  }

  const session = client.startSession();
  try {
    let result: T;
    try {
      await session.withTransaction(async () => {
        result = await fn({ session });
      });
      transactionsSupported = true;
      // result is assigned inside withTransaction's callback before it resolves.
      return result!;
    } catch (err) {
      if (isTransactionsUnsupported(err)) {
        // First time we learn the server is standalone: log once, cache it so we never
        // attempt a session again, then re-run with NO session. The previous bug re-ran with
        // the SAME session, which a standalone server rejects again (code 20) → uncaught 1009.
        logger.warn(
          'mongo transactions unsupported (standalone) — running this and future units of work without a session',
        );
        transactionsSupported = false;
        return fn({});
      }
      throw err;
    }
  } finally {
    await session.endSession();
  }
};

// The mongodb driver (v7) wraps the underlying server error: `session.withTransaction`
// rethrows an error whose top-level `code` is NOT 20 — the IllegalOperation lives nested
// under `originalError` / `errorResponse`. So we scan the error tree (bounded depth) for the
// telltale code (20 = IllegalOperation on a standalone, 263 = OperationNotSupportedInTransaction)
// or message, rather than only inspecting the top level.
const isTransactionsUnsupported = (err: unknown, depth = 0): boolean => {
  if (!err || typeof err !== 'object' || depth > 4) return false;
  const e = err as Record<string, unknown>;

  const message = typeof e['message'] === 'string' ? e['message'] : '';
  if (
    message.includes('Transaction numbers are only allowed') ||
    message.includes('Transactions are not supported') ||
    message.includes('Replica set') ||
    message.includes('replica set member or mongos')
  ) {
    return true;
  }
  if (e['code'] === 20 || e['code'] === 263) return true;
  if (e['codeName'] === 'IllegalOperation' || e['codeName'] === 'OperationNotSupportedInTransaction')
    return true;

  // Recurse into the wrappers the driver attaches.
  return (
    isTransactionsUnsupported(e['originalError'], depth + 1) ||
    isTransactionsUnsupported(e['errorResponse'], depth + 1) ||
    isTransactionsUnsupported(e['cause'], depth + 1)
  );
};

// Repos use this to build the per-call options: a session ONLY when one is present. With
// Tx.session optional, `{}` is the correct standalone shape (no session attached).
export const sessionOpts = (tx?: Tx): { session?: ClientSession } =>
  tx?.session ? { session: tx.session } : {};
