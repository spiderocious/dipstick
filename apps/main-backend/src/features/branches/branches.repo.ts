import type { Product } from '@dipstick/core';

import type { Tx } from '@db/transaction.js';
import type { BranchDoc, PumpDoc, TankDoc } from '@shared/types/documents.js';

export interface BranchRepo {
  findById(id: string): Promise<BranchDoc | null>;
  // Branches in an org, optionally limited to a set of branch ids (a non-owner only sees
  // the branches they are a member of).
  findByOrg(orgId: string, branchIds: string[] | null): Promise<BranchDoc[]>;
  insert(doc: BranchDoc, tx?: Tx): Promise<void>;
  update(
    id: string,
    patch: Partial<Pick<BranchDoc, 'name' | 'city' | 'state' | 'settings'>>,
  ): Promise<void>;
  setArchived(id: string, archived: boolean, at: string | null): Promise<void>;
}

export interface TankRepo {
  findById(id: string): Promise<TankDoc | null>;
  findByBranch(branchId: string): Promise<TankDoc[]>;
  findByProduct(branchId: string, product: Product): Promise<TankDoc | null>;
  insert(doc: TankDoc, tx?: Tx): Promise<void>;
  update(
    id: string,
    patch: Partial<Pick<TankDoc, 'capacityLitres' | 'reorderThresholdLitres'>>,
  ): Promise<void>;
  // Adjust running balance by a signed delta (delivery adds, sales subtract). Atomic.
  adjustBalance(id: string, deltaLitres: number, tx?: Tx): Promise<void>;
  setBalance(id: string, litres: number, tx?: Tx): Promise<void>;
}

export interface PumpRepo {
  findById(id: string): Promise<PumpDoc | null>;
  findByBranch(branchId: string): Promise<PumpDoc[]>;
  insert(doc: PumpDoc, tx?: Tx): Promise<void>;
  update(
    id: string,
    patch: Partial<Pick<PumpDoc, 'label' | 'state' | 'faultNote'>>,
  ): Promise<void>;
}
