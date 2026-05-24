import type { Product } from '@dipstick/core';

import type { Tx } from '@db/transaction.js';
import type { PriceDoc } from '@shared/types/documents.js';

export interface PriceRepo {
  insert(doc: PriceDoc, tx?: Tx): Promise<void>;
  // The price effective for a product at a given instant: the latest price whose
  // effectiveAt <= `at`. This is how a shift pins its price at open time.
  effectiveAt(branchId: string, product: Product, at: string): Promise<PriceDoc | null>;
  // Current price = effective as of now.
  current(branchId: string, product: Product): Promise<PriceDoc | null>;
  history(branchId: string, product: Product): Promise<PriceDoc[]>;
}
