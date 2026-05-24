import type { Tx } from '@db/transaction.js';
import type { RosterDoc } from '@shared/types/documents.js';

export interface RosterRepo {
  findByWeek(branchId: string, weekStart: string): Promise<RosterDoc | null>;
  upsert(doc: RosterDoc, tx?: Tx): Promise<void>;
}
