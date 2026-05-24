import type { Collection } from 'mongodb';

import { getDb } from '@db/client.js';
import { COLLECTION } from '@db/collections.js';
import { buildPage, decodeCursor } from '@lib/pagination.js';
import type { ExpenseDoc } from '@shared/types/documents.js';

import type { ExpenseRepo } from './expenses.repo.js';

const expenses = (): Collection<ExpenseDoc> =>
  getDb().collection<ExpenseDoc>(COLLECTION.expenses);

export const expenseRepo: ExpenseRepo = {
  findById: (id) => expenses().findOne({ _id: id }),
  insert: async (doc, tx) => {
    await expenses().insertOne(doc, tx ? { session: tx.session } : {});
  },
  list: async (query) => {
    const filter: Record<string, unknown> = { branchId: query.branchId };
    if (query.category) filter['category'] = query.category;

    // Cursor is the `createdAt` ISO timestamp; we page backwards in time (newest first).
    const cursor = decodeCursor(query.cursor);
    if (cursor) filter['createdAt'] = { $lt: cursor };

    const rows = await expenses()
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit + 1)
      .toArray();
    return buildPage(rows, query.limit, (r) => r.createdAt);
  },
};
