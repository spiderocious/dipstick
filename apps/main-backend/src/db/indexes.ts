import { getDb } from './client.js';
import { COLLECTION } from './collections.js';
import { logger } from '@lib/logger.js';

// Idempotent index creation, run once at boot. Tenancy ({orgId}) and the hot read paths
// (daybook by branch+date, memberships by user) get indexes; unique constraints back the
// conflict (1005) errors.
export const ensureIndexes = async (): Promise<void> => {
  const db = getDb();

  await db.collection(COLLECTION.users).createIndex({ email: 1 }, { unique: true });
  await db.collection(COLLECTION.users).createIndex({ phone: 1 }, { unique: true });

  await db.collection(COLLECTION.orgs).createIndex({ ownerId: 1 });

  await db.collection(COLLECTION.memberships).createIndex({ userId: 1 });
  await db.collection(COLLECTION.memberships).createIndex({ orgId: 1, branchId: 1 });
  await db
    .collection(COLLECTION.memberships)
    .createIndex({ orgId: 1, userId: 1, branchId: 1 }, { unique: true });

  await db.collection(COLLECTION.roles).createIndex({ orgId: 1 });
  await db.collection(COLLECTION.roles).createIndex({ orgId: 1, name: 1 }, { unique: true });

  await db.collection(COLLECTION.branches).createIndex({ orgId: 1 });
  await db.collection(COLLECTION.tanks).createIndex({ branchId: 1 });
  await db
    .collection(COLLECTION.tanks)
    .createIndex({ branchId: 1, product: 1 }, { unique: true });
  await db.collection(COLLECTION.pumps).createIndex({ branchId: 1 });

  await db.collection(COLLECTION.roster).createIndex({ branchId: 1, weekStart: 1 });

  await db.collection(COLLECTION.shifts).createIndex({ branchId: 1, businessDate: 1 });
  await db.collection(COLLECTION.shifts).createIndex({ branchId: 1, status: 1 });
  await db.collection(COLLECTION.shifts).createIndex({ attendantId: 1, openedAt: 1 });

  await db.collection(COLLECTION.dips).createIndex({ branchId: 1, businessDate: 1, tankId: 1 });
  await db.collection(COLLECTION.deliveries).createIndex({ branchId: 1, createdAt: 1 });
  await db.collection(COLLECTION.prices).createIndex({ branchId: 1, product: 1, effectiveAt: 1 });
  await db.collection(COLLECTION.expenses).createIndex({ branchId: 1, businessDate: 1 });

  await db.collection(COLLECTION.notes).createIndex({ entityType: 1, entityId: 1 });
  await db.collection(COLLECTION.notifications).createIndex({ userId: 1, createdAt: -1 });
  await db.collection(COLLECTION.audit).createIndex({ orgId: 1, branchId: 1, at: -1 });
  await db.collection(COLLECTION.audit).createIndex({ entityType: 1, entityId: 1, at: -1 });

  // OTP + refresh tokens expire via TTL.
  await db.collection(COLLECTION.otps).createIndex({ phone: 1 });
  await db.collection(COLLECTION.otps).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection(COLLECTION.sessions).createIndex({ userId: 1 });
  await db
    .collection(COLLECTION.sessions)
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  logger.info('mongo indexes ensured');
};
