import type { Collection } from 'mongodb';

import { getDb } from '@db/client.js';
import { COLLECTION } from '@db/collections.js';
import { sessionOpts } from '@db/transaction.js';
import { buildPage, decodeCursor } from '@lib/pagination.js';
import type { NotificationDoc } from '@shared/types/documents.js';

import type { NotificationRepo } from './notifications.repo.js';

const notifications = (): Collection<NotificationDoc> =>
  getDb().collection<NotificationDoc>(COLLECTION.notifications);

export const notificationRepo: NotificationRepo = {
  insert: async (doc, tx) => {
    await notifications().insertOne(doc, sessionOpts(tx));
  },
  listForUser: async (query) => {
    const filter: Record<string, unknown> = { userId: query.userId };
    // Cursor is the `createdAt` ISO timestamp; we page backwards in time (newest first).
    const cursor = decodeCursor(query.cursor);
    if (cursor) filter['createdAt'] = { $lt: cursor };

    const rows = await notifications()
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit + 1)
      .toArray();
    return buildPage(rows, query.limit, (r) => r.createdAt);
  },
  countUnread: (userId) => notifications().countDocuments({ userId, readAt: null }),
  markRead: async (id, userId, at) => {
    const result = await notifications().updateOne(
      { _id: id, userId },
      { $set: { readAt: at, updatedAt: at } },
    );
    return result.matchedCount > 0;
  },
  findById: (id) => notifications().findOne({ _id: id }),
};
