import type { DeliveryStage, Product } from '@dipstick/core';

import { withTransaction } from '@db/transaction.js';
import { newId } from '@lib/ids.js';
import type { Page } from '@lib/pagination.js';
import { fail, ok, type ServiceResult } from '@lib/service-result.js';
import { ERROR_CODE } from '@shared/constants/error-codes.js';
import type { DeliveryDoc } from '@shared/types/documents.js';

import { auditService, type AuditService } from '../audit/audit.service.js';
import type { BranchRepo, TankRepo } from '../branches/branches.repo.js';
import { branchRepo, tankRepo } from '../branches/branches.repo.mongo.js';
import type { DeliveryListQuery, DeliveryRepo } from './deliveries.repo.js';
import { deliveryRepo } from './deliveries.repo.mongo.js';

const now = (): string => new Date().toISOString();

// Delivery variance: (dip_before + waybill load) vs dip_after. Positive means less arrived
// than expected (a loss); flagged against the branch's tolerance.
const computeVariance = (
  dipBefore: number | null,
  dipAfter: number | null,
  waybillLitres: number,
): number | null => {
  if (dipBefore === null || dipAfter === null) return null;
  return Math.round((dipBefore + waybillLitres - dipAfter) * 100) / 100;
};

export class DeliveriesService {
  private constructor(
    private readonly deliveries: DeliveryRepo = deliveryRepo,
    private readonly branches: BranchRepo = branchRepo,
    private readonly tanks: TankRepo = tankRepo,
    private readonly audit: AuditService = auditService,
  ) {}
  private static instance: DeliveriesService;
  static getInstance(): DeliveriesService {
    if (!DeliveriesService.instance) DeliveriesService.instance = new DeliveriesService();
    return DeliveriesService.instance;
  }

  list(query: DeliveryListQuery): Promise<Page<DeliveryDoc>> {
    return this.deliveries.list(query);
  }

  async create(
    orgId: string,
    branchId: string,
    input: {
      tankId: string;
      product: Product;
      waybillNumber: string;
      supplier: string;
      driverName: string;
      truckPlate: string;
      witness?: string | null;
      waybillLitres: number;
      costPerLitreKobo: number;
    },
    actorId: string,
  ): Promise<ServiceResult<DeliveryDoc>> {
    const branch = await this.branches.findById(branchId);
    if (!branch || branch.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'branch_not_found');
    if (branch.isArchived) return fail(ERROR_CODE.INVALID_STATE, 'branch_archived');
    const tank = await this.tanks.findById(input.tankId);
    if (!tank || tank.branchId !== branchId)
      return fail(ERROR_CODE.NOT_FOUND, 'tank_not_found', { field: 'tank_id' });

    const ts = now();
    const doc: DeliveryDoc = {
      _id: newId('delivery'),
      orgId,
      branchId,
      tankId: input.tankId,
      product: input.product,
      waybillNumber: input.waybillNumber,
      supplier: input.supplier,
      driverName: input.driverName,
      truckPlate: input.truckPlate,
      witness: input.witness ?? null,
      waybillLitres: input.waybillLitres,
      costPerLitreKobo: input.costPerLitreKobo,
      dipBeforeLitres: null,
      dipAfterLitres: null,
      varianceLitres: null,
      stage: 'arrived',
      arrivedAt: ts,
      signedBy: null,
      signedAt: null,
      recordedBy: actorId,
      createdAt: ts,
      updatedAt: ts,
    };
    await this.deliveries.insert(doc);
    await this.audit.record({
      orgId,
      branchId,
      actorId,
      action: 'delivery.recorded',
      entityType: 'delivery',
      entityId: doc._id,
      after: { waybillNumber: doc.waybillNumber, waybillLitres: doc.waybillLitres },
    });
    return ok(doc);
  }

  // Step the four-stage flow: arrived -> dip_before -> offloaded -> (signed via sign()).
  async update(
    orgId: string,
    deliveryId: string,
    patch: {
      stage?: DeliveryStage;
      dipBeforeLitres?: number;
      dipAfterLitres?: number;
      witness?: string | null;
    },
    actorId: string,
  ): Promise<ServiceResult<DeliveryDoc>> {
    const delivery = await this.deliveries.findById(deliveryId);
    if (!delivery || delivery.orgId !== orgId)
      return fail(ERROR_CODE.NOT_FOUND, 'delivery_not_found');
    if (delivery.stage === 'signed') return fail(ERROR_CODE.INVALID_STATE, 'delivery_already_signed');

    const next: Partial<DeliveryDoc> = {};
    if (patch.dipBeforeLitres !== undefined) next.dipBeforeLitres = patch.dipBeforeLitres;
    if (patch.dipAfterLitres !== undefined) next.dipAfterLitres = patch.dipAfterLitres;
    if (patch.witness !== undefined) next.witness = patch.witness;
    if (patch.stage !== undefined) next.stage = patch.stage;

    const dipBefore = next.dipBeforeLitres ?? delivery.dipBeforeLitres;
    const dipAfter = next.dipAfterLitres ?? delivery.dipAfterLitres;
    next.varianceLitres = computeVariance(dipBefore, dipAfter, delivery.waybillLitres);

    await this.deliveries.update(deliveryId, next);
    await this.audit.record({
      orgId,
      branchId: delivery.branchId,
      actorId,
      action: 'delivery.updated',
      entityType: 'delivery',
      entityId: deliveryId,
      after: next,
    });
    return ok({ ...delivery, ...next });
  }

  // Sign: witness required, both dips present. Files the waybill and credits the tank with
  // the measured delivered litres (dip_after - dip_before), atomically.
  async sign(
    orgId: string,
    deliveryId: string,
    witness: string,
    actorId: string,
  ): Promise<ServiceResult<DeliveryDoc>> {
    const delivery = await this.deliveries.findById(deliveryId);
    if (!delivery || delivery.orgId !== orgId)
      return fail(ERROR_CODE.NOT_FOUND, 'delivery_not_found');
    if (delivery.stage === 'signed') return fail(ERROR_CODE.INVALID_STATE, 'delivery_already_signed');
    if (delivery.dipBeforeLitres === null || delivery.dipAfterLitres === null) {
      return fail(ERROR_CODE.BUSINESS_RULE, 'delivery_dips_required');
    }

    const deliveredLitres = delivery.dipAfterLitres - delivery.dipBeforeLitres;
    const ts = now();
    const patch: Partial<DeliveryDoc> = {
      stage: 'signed',
      witness,
      signedBy: actorId,
      signedAt: ts,
      varianceLitres: computeVariance(
        delivery.dipBeforeLitres,
        delivery.dipAfterLitres,
        delivery.waybillLitres,
      ),
    };

    await withTransaction(async (tx) => {
      await this.deliveries.update(deliveryId, patch, tx);
      // Tank balance reflects the physical dip-after. Set, don't add — the dip is truth.
      await this.tanks.setBalance(delivery.tankId, delivery.dipAfterLitres ?? 0, tx);
      await this.audit.record(
        {
          orgId,
          branchId: delivery.branchId,
          actorId,
          action: 'delivery.signed',
          entityType: 'delivery',
          entityId: deliveryId,
          after: { deliveredLitres, witness },
          note: `Delivered ${deliveredLitres} L`,
        },
        tx,
      );
    });
    return ok({ ...delivery, ...patch });
  }

  async getById(orgId: string, deliveryId: string): Promise<ServiceResult<DeliveryDoc>> {
    const delivery = await this.deliveries.findById(deliveryId);
    if (!delivery || delivery.orgId !== orgId)
      return fail(ERROR_CODE.NOT_FOUND, 'delivery_not_found');
    return ok(delivery);
  }
}

export const deliveriesService = DeliveriesService.getInstance();
