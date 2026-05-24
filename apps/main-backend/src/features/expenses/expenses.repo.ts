import type { Tx } from '@db/transaction.js';
import type { Page, PageParams } from '@lib/pagination.js';
import type { ExpenseDoc } from '@shared/types/documents.js';

// Expenses are listed newest-first within a branch, cursor-paginated on createdAt. Category
// is an optional free-string filter — never an enum.
export interface ExpenseListQuery extends PageParams {
  branchId: string;
  category?: string;
}

export interface ExpenseRepo {
  findById(id: string): Promise<ExpenseDoc | null>;
  insert(doc: ExpenseDoc, tx?: Tx): Promise<void>;
  list(query: ExpenseListQuery): Promise<Page<ExpenseDoc>>;
}
