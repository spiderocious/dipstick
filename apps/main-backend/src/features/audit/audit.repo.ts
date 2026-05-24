import type { Collection } from 'mongodb';

import { getDb } from '@db/client.js';
import { COLLECTION } from '@db/collections.js';
import type { Tx } from '@db/transaction.js';
import type { AuditDoc } from '@shared/types/documents.js';
import type { Page, PageParams } from '@lib/pagination.js';
import { buildPage, decodeCursor } from '@lib/pagination.js';

export interface AuditQuery extends PageParams {
  orgId: string;
  branchId?: string;
  entityType?: string;
  entityId?: string;
}

export interface AuditRepo {
  insert(doc: AuditDoc, tx?: Tx): Promise<void>;
  list(query: AuditQuery): Promise<Page<AuditDoc>>;
}

const coll = (): Collection<AuditDoc> => getDb().collection<AuditDoc>(COLLECTION.audit);

export const auditRepo: AuditRepo = {
  insert: async (doc, tx) => {
    await coll().insertOne(doc, tx ? { session: tx.session } : {});
  },
  list: async (query) => {
    const filter: Record<string, unknown> = { orgId: query.orgId };
    if (query.branchId) filter['branchId'] = query.branchId;
    if (query.entityType) filter['entityType'] = query.entityType;
    if (query.entityId) filter['entityId'] = query.entityId;

    // Cursor is the `at` ISO timestamp; we page backwards in time (newest first).
    const cursor = decodeCursor(query.cursor);
    if (cursor) filter['at'] = { $lt: cursor };

    const rows = await coll()
      .find(filter)
      .sort({ at: -1 })
      .limit(query.limit + 1)
      .toArray();
    return buildPage(rows, query.limit, (r) => r.at);
  },
};
