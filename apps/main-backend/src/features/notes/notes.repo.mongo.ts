import type { Collection } from 'mongodb';

import { getDb } from '@db/client.js';
import { COLLECTION } from '@db/collections.js';
import { buildPage, decodeCursor } from '@lib/pagination.js';
import type { NoteDoc } from '@shared/types/documents.js';

import type { NoteRepo } from './notes.repo.js';

const notes = (): Collection<NoteDoc> => getDb().collection<NoteDoc>(COLLECTION.notes);

export const noteRepo: NoteRepo = {
  insert: async (doc, tx) => {
    await notes().insertOne(doc, tx ? { session: tx.session } : {});
  },
  listByEntity: async (query) => {
    const filter: Record<string, unknown> = {
      entityType: query.entityType,
      entityId: query.entityId,
    };

    // Cursor is the `createdAt` ISO timestamp; we page backwards in time (newest first).
    const cursor = decodeCursor(query.cursor);
    if (cursor) filter['createdAt'] = { $lt: cursor };

    const rows = await notes()
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit + 1)
      .toArray();
    return buildPage(rows, query.limit, (r) => r.createdAt);
  },
};
