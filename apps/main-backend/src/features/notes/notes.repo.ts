import type { Tx } from '@db/transaction.js';
import type { Page, PageParams } from '@lib/pagination.js';
import type { NoteDoc, NoteEntityType } from '@shared/types/documents.js';

// Notes hang off an entity (a shift, expense or delivery) and are listed newest-first,
// cursor-paginated on createdAt — the same wire contract as expenses and the audit log.
export interface NoteListQuery extends PageParams {
  entityType: NoteEntityType;
  entityId: string;
}

export interface NoteRepo {
  insert(doc: NoteDoc, tx?: Tx): Promise<void>;
  listByEntity(query: NoteListQuery): Promise<Page<NoteDoc>>;
}
