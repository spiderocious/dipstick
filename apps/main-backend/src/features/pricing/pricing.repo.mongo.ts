import type { Collection } from 'mongodb';

import type { Product } from '@dipstick/core';

import { getDb } from '@db/client.js';
import { COLLECTION } from '@db/collections.js';
import type { PriceDoc } from '@shared/types/documents.js';

import type { PriceRepo } from './pricing.repo.js';

const prices = (): Collection<PriceDoc> => getDb().collection<PriceDoc>(COLLECTION.prices);

export const priceRepo: PriceRepo = {
  insert: async (doc, tx) => {
    await prices().insertOne(doc, tx ? { session: tx.session } : {});
  },
  effectiveAt: (branchId, product, at) =>
    prices()
      .find({ branchId, product, effectiveAt: { $lte: at } })
      .sort({ effectiveAt: -1 })
      .limit(1)
      .next(),
  current: (branchId: string, product: Product) =>
    prices()
      .find({ branchId, product, effectiveAt: { $lte: new Date().toISOString() } })
      .sort({ effectiveAt: -1 })
      .limit(1)
      .next(),
  history: (branchId, product) =>
    prices().find({ branchId, product }).sort({ effectiveAt: -1 }).toArray(),
};
