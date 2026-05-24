import type { Product } from '@dipstick/core';

import type { Tx } from '@db/transaction.js';
import type { DipDoc, ShiftDoc } from '@shared/types/documents.js';

export interface ShiftRepo {
  findById(id: string): Promise<ShiftDoc | null>;
  insert(doc: ShiftDoc, tx?: Tx): Promise<void>;
  update(id: string, patch: Partial<ShiftDoc>, tx?: Tx): Promise<void>;
  // Latest closing meter for a pump (carries forward as the next opening meter).
  lastClosingMeter(pumpId: string): Promise<number | null>;
  // All shifts for a branch on a business date, in the order opened.
  findByBranchDate(branchId: string, businessDate: string): Promise<ShiftDoc[]>;
  // Balanced, closed-but-unposted shifts (for post-all-balanced).
  findBalancedClosed(branchId: string, businessDate: string): Promise<ShiftDoc[]>;
}

export interface DipRepo {
  insert(doc: DipDoc, tx?: Tx): Promise<void>;
  findByBranchDate(branchId: string, businessDate: string): Promise<DipDoc[]>;
  findLatestClosing(branchId: string, tankId: string, beforeDate: string): Promise<DipDoc | null>;
  findForDateTank(
    branchId: string,
    businessDate: string,
    tankId: string,
    kind: 'opening' | 'closing',
  ): Promise<DipDoc | null>;
  // Sum of litres dispensed (sold) for a product on a date, from posted shifts — wet stock.
  soldLitres(branchId: string, businessDate: string, product: Product): Promise<number>;
}
