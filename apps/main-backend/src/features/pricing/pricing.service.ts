import type { Product } from '@dipstick/core';

import { newId } from '@lib/ids.js';
import { fail, ok, type ServiceResult } from '@lib/service-result.js';
import { ERROR_CODE } from '@shared/constants/error-codes.js';
import type { PriceDoc } from '@shared/types/documents.js';

import { auditService, type AuditService } from '../audit/audit.service.js';
import type { BranchRepo, TankRepo } from '../branches/branches.repo.js';
import { branchRepo, tankRepo } from '../branches/branches.repo.mongo.js';
import type { PriceRepo } from './pricing.repo.js';
import { priceRepo } from './pricing.repo.mongo.js';

const now = (): string => new Date().toISOString();

export class PricingService {
  private constructor(
    private readonly prices: PriceRepo = priceRepo,
    private readonly branches: BranchRepo = branchRepo,
    private readonly tanks: TankRepo = tankRepo,
    private readonly audit: AuditService = auditService,
  ) {}
  private static instance: PricingService;
  static getInstance(): PricingService {
    if (!PricingService.instance) PricingService.instance = new PricingService();
    return PricingService.instance;
  }

  // The pinning rule lives here: a shift resolves its price via effectiveAt(openedAt). A
  // price with a future effective time does not affect shifts opened before that moment.
  async priceForOpen(branchId: string, product: Product, openedAt: string): Promise<PriceDoc | null> {
    return this.prices.effectiveAt(branchId, product, openedAt);
  }

  async currentAll(branchId: string): Promise<Record<Product, PriceDoc | null>> {
    const products: Product[] = ['PMS', 'AGO', 'DPK'];
    const entries = await Promise.all(
      products.map(async (p) => [p, await this.prices.current(branchId, p)] as const),
    );
    return Object.fromEntries(entries) as Record<Product, PriceDoc | null>;
  }

  history(branchId: string, product: Product): Promise<PriceDoc[]> {
    return this.prices.history(branchId, product);
  }

  async set(
    orgId: string,
    branchId: string,
    input: { product: Product; pricePerLitreKobo: number; effectiveAt: string; reason: string },
    actorId: string,
    isOrgWide: boolean,
  ): Promise<ServiceResult<PriceDoc>> {
    const branch = await this.branches.findById(branchId);
    if (!branch || branch.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'branch_not_found');
    if (branch.isArchived) return fail(ERROR_CODE.INVALID_STATE, 'branch_archived');
    // Per-branch gate (DIV-08): when the branch does not permit managers to set price, only an
    // owner (org-wide membership) may — even if a branch-scoped role carries CAN_SET_PRICE.
    if (!isOrgWide && !branch.settings.managerMaySetPrice) {
      return fail(ERROR_CODE.FORBIDDEN, 'price_manager_not_permitted');
    }

    const previous = await this.prices.current(branchId, input.product);
    const doc: PriceDoc = {
      _id: newId('price'),
      orgId,
      branchId,
      product: input.product,
      pricePerLitreKobo: input.pricePerLitreKobo,
      previousPricePerLitreKobo: previous?.pricePerLitreKobo ?? null,
      effectiveAt: input.effectiveAt,
      reason: input.reason,
      setBy: actorId,
      createdAt: now(),
      updatedAt: now(),
    };
    await this.prices.insert(doc);
    await this.audit.record({
      orgId,
      branchId,
      actorId,
      action: 'price.set',
      entityType: 'price',
      entityId: doc._id,
      before: { price_per_litre_kobo: previous?.pricePerLitreKobo ?? null },
      after: { price_per_litre_kobo: doc.pricePerLitreKobo, effective_at: doc.effectiveAt },
      note: doc.reason,
    });
    return ok(doc);
  }

  // Preview the impact of a proposed price before confirming.
  async preview(
    orgId: string,
    branchId: string,
    product: Product,
    proposedKobo: number,
  ): Promise<
    ServiceResult<{
      deltaPerLitreKobo: number;
      litresInTank: number;
      revaluationKobo: number;
      currentPriceKobo: number | null;
    }>
  > {
    const branch = await this.branches.findById(branchId);
    if (!branch || branch.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'branch_not_found');
    const current = await this.prices.current(branchId, product);
    const tank = await this.tanks.findByProduct(branchId, product);
    const currentKobo = current?.pricePerLitreKobo ?? null;
    const delta = proposedKobo - (currentKobo ?? 0);
    const litres = tank?.currentLitres ?? 0;
    return ok({
      deltaPerLitreKobo: delta,
      litresInTank: litres,
      // Re-valuation of stock at the new price: litres × delta (integer kobo).
      revaluationKobo: Math.round(litres * delta),
      currentPriceKobo: currentKobo,
    });
  }
}

export const pricingService = PricingService.getInstance();
