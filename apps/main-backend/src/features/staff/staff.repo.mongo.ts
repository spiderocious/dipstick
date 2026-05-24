import type { Collection } from 'mongodb';

import { getDb } from '@db/client.js';
import { COLLECTION } from '@db/collections.js';
import { sessionOpts } from '@db/transaction.js';
import type { RosterDoc } from '@shared/types/documents.js';

import type { RosterRepo } from './staff.repo.js';

const roster = (): Collection<RosterDoc> => getDb().collection<RosterDoc>(COLLECTION.roster);

export const rosterRepo: RosterRepo = {
  findByWeek: (branchId, weekStart) => roster().findOne({ branchId, weekStart }),
  upsert: async (doc, tx) => {
    await roster().updateOne(
      { branchId: doc.branchId, weekStart: doc.weekStart },
      { $set: { assignments: doc.assignments, updatedAt: doc.updatedAt }, $setOnInsert: { _id: doc._id, orgId: doc.orgId, branchId: doc.branchId, weekStart: doc.weekStart, createdAt: doc.createdAt } },
      { upsert: true, ...sessionOpts(tx) },
    );
  },
};
