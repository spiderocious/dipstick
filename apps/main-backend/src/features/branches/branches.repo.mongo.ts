import type { Collection } from 'mongodb';

import { getDb } from '@db/client.js';
import { COLLECTION } from '@db/collections.js';
import type { Tx } from '@db/transaction.js';
import type { BranchDoc, PumpDoc, TankDoc } from '@shared/types/documents.js';

import type { BranchRepo, PumpRepo, TankRepo } from './branches.repo.js';

const sess = (tx?: Tx) => (tx ? { session: tx.session } : {});
const branches = (): Collection<BranchDoc> => getDb().collection<BranchDoc>(COLLECTION.branches);
const tanks = (): Collection<TankDoc> => getDb().collection<TankDoc>(COLLECTION.tanks);
const pumps = (): Collection<PumpDoc> => getDb().collection<PumpDoc>(COLLECTION.pumps);

export const branchRepo: BranchRepo = {
  findById: (id) => branches().findOne({ _id: id }),
  findByOrg: (orgId, branchIds) => {
    const filter: Record<string, unknown> = { orgId };
    if (branchIds !== null) filter['_id'] = { $in: branchIds };
    return branches().find(filter).sort({ createdAt: 1 }).toArray();
  },
  insert: async (doc, tx) => {
    await branches().insertOne(doc, sess(tx));
  },
  update: async (id, patch) => {
    await branches().updateOne(
      { _id: id },
      { $set: { ...patch, updatedAt: new Date().toISOString() } },
    );
  },
  setArchived: async (id, archived, at) => {
    await branches().updateOne(
      { _id: id },
      { $set: { isArchived: archived, archivedAt: at, updatedAt: new Date().toISOString() } },
    );
  },
};

export const tankRepo: TankRepo = {
  findById: (id) => tanks().findOne({ _id: id }),
  findByBranch: (branchId) => tanks().find({ branchId }).sort({ product: 1 }).toArray(),
  findByProduct: (branchId, product) => tanks().findOne({ branchId, product }),
  insert: async (doc, tx) => {
    await tanks().insertOne(doc, sess(tx));
  },
  update: async (id, patch) => {
    await tanks().updateOne(
      { _id: id },
      { $set: { ...patch, updatedAt: new Date().toISOString() } },
    );
  },
  adjustBalance: async (id, deltaLitres, tx) => {
    await tanks().updateOne(
      { _id: id },
      { $inc: { currentLitres: deltaLitres }, $set: { updatedAt: new Date().toISOString() } },
      sess(tx),
    );
  },
  setBalance: async (id, litres, tx) => {
    await tanks().updateOne(
      { _id: id },
      { $set: { currentLitres: litres, updatedAt: new Date().toISOString() } },
      sess(tx),
    );
  },
};

export const pumpRepo: PumpRepo = {
  findById: (id) => pumps().findOne({ _id: id }),
  findByBranch: (branchId) => pumps().find({ branchId }).sort({ createdAt: 1 }).toArray(),
  insert: async (doc, tx) => {
    await pumps().insertOne(doc, sess(tx));
  },
  update: async (id, patch) => {
    await pumps().updateOne(
      { _id: id },
      { $set: { ...patch, updatedAt: new Date().toISOString() } },
    );
  },
};
