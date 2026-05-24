import type { Tx } from '@db/transaction.js';
import type { Page, PageParams } from '@lib/pagination.js';
import type { DeliveryDoc } from '@shared/types/documents.js';

export interface DeliveryListQuery extends PageParams {
  branchId: string;
}

export interface DeliveryRepo {
  findById(id: string): Promise<DeliveryDoc | null>;
  insert(doc: DeliveryDoc, tx?: Tx): Promise<void>;
  update(id: string, patch: Partial<DeliveryDoc>, tx?: Tx): Promise<void>;
  list(query: DeliveryListQuery): Promise<Page<DeliveryDoc>>;
}
