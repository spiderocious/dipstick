import type { Collection } from 'mongodb';


import { getDb } from '@db/client.js';
import { COLLECTION } from '@db/collections.js';
import type { Tx } from '@db/transaction.js';
import type { DipDoc, ShiftDoc } from '@shared/types/documents.js';

import type { DipRepo, ShiftRepo } from './shifts.repo.js';

const sess = (tx?: Tx) => (tx ? { session: tx.session } : {});
const shifts = (): Collection<ShiftDoc> => getDb().collection<ShiftDoc>(COLLECTION.shifts);
const dips = (): Collection<DipDoc> => getDb().collection<DipDoc>(COLLECTION.dips);

export const shiftRepo: ShiftRepo = {
  findById: (id) => shifts().findOne({ _id: id }),
  insert: async (doc, tx) => {
    await shifts().insertOne(doc, sess(tx));
  },
  update: async (id, patch, tx) => {
    await shifts().updateOne(
      { _id: id },
      { $set: { ...patch, updatedAt: new Date().toISOString() } },
      sess(tx),
    );
  },
  lastClosingMeter: async (pumpId) => {
    const last = await shifts()
      .find({ pumpId, closingMeter: { $ne: null } })
      .sort({ closedAt: -1 })
      .limit(1)
      .next();
    return last?.closingMeter ?? null;
  },
  findByBranchDate: (branchId, businessDate) =>
    shifts().find({ branchId, businessDate }).sort({ openedAt: 1 }).toArray(),
  findBalancedClosed: (branchId, businessDate) =>
    shifts()
      .find({ branchId, businessDate, status: 'closed', varianceStatus: 'balanced' })
      .toArray(),
};

export const dipRepo: DipRepo = {
  insert: async (doc, tx) => {
    await dips().insertOne(doc, sess(tx));
  },
  findByBranchDate: (branchId, businessDate) =>
    dips().find({ branchId, businessDate }).sort({ createdAt: 1 }).toArray(),
  findLatestClosing: (branchId, tankId, beforeDate) =>
    dips()
      .find({ branchId, tankId, kind: 'closing', businessDate: { $lt: beforeDate } })
      .sort({ businessDate: -1 })
      .limit(1)
      .next(),
  findForDateTank: (branchId, businessDate, tankId, kind) =>
    dips().findOne({ branchId, businessDate, tankId, kind }),
  soldLitres: async (branchId, businessDate, product) => {
    const rows = await shifts()
      .aggregate<{ total: number }>([
        {
          $match: {
            branchId,
            businessDate,
            status: 'posted',
          },
        },
        // Join product via pump is avoided — shifts store product implicitly through pump,
        // so we filter by pumps of this product using a lookup on pumpId.
        {
          $lookup: {
            from: COLLECTION.pumps,
            localField: 'pumpId',
            foreignField: '_id',
            as: 'pump',
          },
        },
        { $match: { 'pump.product': product } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$litres', 0] } } } },
      ])
      .toArray();
    return rows[0]?.total ?? 0;
  },
};
