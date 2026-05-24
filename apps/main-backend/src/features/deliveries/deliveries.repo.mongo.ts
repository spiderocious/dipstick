import type { Collection } from 'mongodb';

import { getDb } from '@db/client.js';
import { COLLECTION } from '@db/collections.js';
import type { Tx } from '@db/transaction.js';
import { buildPage, decodeCursor } from '@lib/pagination.js';
import type { DeliveryDoc } from '@shared/types/documents.js';

import type { DeliveryRepo } from './deliveries.repo.js';

const sess = (tx?: Tx) => (tx ? { session: tx.session } : {});
const deliveries = (): Collection<DeliveryDoc> =>
  getDb().collection<DeliveryDoc>(COLLECTION.deliveries);

export const deliveryRepo: DeliveryRepo = {
  findById: (id) => deliveries().findOne({ _id: id }),
  insert: async (doc, tx) => {
    await deliveries().insertOne(doc, sess(tx));
  },
  update: async (id, patch, tx) => {
    await deliveries().updateOne(
      { _id: id },
      { $set: { ...patch, updatedAt: new Date().toISOString() } },
      sess(tx),
    );
  },
  list: async (query) => {
    const filter: Record<string, unknown> = { branchId: query.branchId };
    const cursor = decodeCursor(query.cursor);
    if (cursor) filter['createdAt'] = { $lt: cursor };
    const rows = await deliveries()
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit + 1)
      .toArray();
    return buildPage(rows, query.limit, (r) => r.createdAt);
  },
};
