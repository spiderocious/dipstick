import { P, type Product, type ShiftWindow } from '@dipstick/core';

import { withTransaction } from '@db/transaction.js';
import { newId } from '@lib/ids.js';
import { fail, ok, type ServiceResult } from '@lib/service-result.js';
import { ERROR_CODE } from '@shared/constants/error-codes.js';
import type { DipDoc, ShiftDoc, TankDoc } from '@shared/types/documents.js';

import { auditService, type AuditService } from '../audit/audit.service.js';
import type { BranchRepo, PumpRepo, TankRepo } from '../branches/branches.repo.js';
import { branchRepo, pumpRepo, tankRepo } from '../branches/branches.repo.mongo.js';
import { pricingService, type PricingService } from '../pricing/pricing.service.js';
import { reconcile } from './reconciliation.js';
import type { DipRepo, ShiftRepo } from './shifts.repo.js';
import { dipRepo, shiftRepo } from './shifts.repo.mongo.js';

const now = (): string => new Date().toISOString();

// Caller info the service needs for own-pump checks and attribution. Extracted in the
// controller from req.auth (never the raw req).
export interface Caller {
  userId: string;
  permissions: Set<string>;
  defaultPumpId: string | null;
}

export class ShiftsService {
  private constructor(
    private readonly shifts: ShiftRepo = shiftRepo,
    private readonly dips: DipRepo = dipRepo,
    private readonly branches: BranchRepo = branchRepo,
    private readonly pumps: PumpRepo = pumpRepo,
    private readonly tanks: TankRepo = tankRepo,
    private readonly pricing: PricingService = pricingService,
    private readonly audit: AuditService = auditService,
  ) {}
  private static instance: ShiftsService;
  static getInstance(): ShiftsService {
    if (!ShiftsService.instance) ShiftsService.instance = new ShiftsService();
    return ShiftsService.instance;
  }

  async open(
    orgId: string,
    branchId: string,
    input: {
      pumpId: string;
      attendantId: string;
      window: ShiftWindow;
      businessDate: string;
      openingMeter: number;
      pricePerLitreKobo?: number;
      priceOverrideReason?: string;
      product?: Product;
    },
    actorId: string,
  ): Promise<ServiceResult<ShiftDoc>> {
    const branch = await this.branches.findById(branchId);
    if (!branch || branch.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'branch_not_found');
    if (branch.isArchived) return fail(ERROR_CODE.INVALID_STATE, 'branch_archived');
    const pump = await this.pumps.findById(input.pumpId);
    if (!pump || pump.branchId !== branchId)
      return fail(ERROR_CODE.NOT_FOUND, 'pump_not_found', { field: 'pump_id' });

    const openedAt = now();
    // Pin the price: override (with reason) or the price effective at open time.
    let pricePerLitreKobo: number;
    if (input.pricePerLitreKobo !== undefined) {
      if (!input.priceOverrideReason) {
        return fail(ERROR_CODE.VALIDATION, 'price_reason_required', {
          field: 'price_override_reason',
        });
      }
      pricePerLitreKobo = input.pricePerLitreKobo;
    } else {
      const pinned = await this.pricing.priceForOpen(branchId, pump.product, openedAt);
      if (!pinned) return fail(ERROR_CODE.BUSINESS_RULE, 'price_not_found', { field: 'pump_id' });
      pricePerLitreKobo = pinned.pricePerLitreKobo;
    }

    const doc: ShiftDoc = {
      _id: newId('shift'),
      orgId,
      branchId,
      pumpId: input.pumpId,
      attendantId: input.attendantId,
      window: input.window,
      businessDate: input.businessDate,
      openingMeter: input.openingMeter,
      closingMeter: null,
      litres: null,
      pricePerLitreKobo,
      expectedGrossKobo: null,
      cashDeclaredKobo: null,
      varianceKobo: null,
      varianceStatus: null,
      status: 'open',
      openedBy: actorId,
      openedAt,
      closedBy: null,
      closedAt: null,
      postedBy: null,
      postedAt: null,
      voidedBy: null,
      voidedAt: null,
      voidReason: null,
      createdAt: openedAt,
      updatedAt: openedAt,
    };

    await withTransaction(async (tx) => {
      await this.shifts.insert(doc, tx);
      await this.pumps.update(input.pumpId, { state: 'live' });
      await this.audit.record(
        {
          orgId,
          branchId,
          actorId,
          action: 'shift.opened',
          entityType: 'shift',
          entityId: doc._id,
          after: { pumpId: doc.pumpId, attendantId: doc.attendantId, openingMeter: doc.openingMeter },
        },
        tx,
      );
    });
    return ok(doc);
  }

  // The opening meter carried forward from a pump's last closing meter (read-only helper).
  async carryForwardMeter(pumpId: string): Promise<number | null> {
    return this.shifts.lastClosingMeter(pumpId);
  }

  async getById(orgId: string, shiftId: string): Promise<ServiceResult<ShiftDoc>> {
    const shift = await this.shifts.findById(shiftId);
    if (!shift || shift.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'shift_not_found');
    return ok(shift);
  }

  async close(
    orgId: string,
    shiftId: string,
    input: { closingMeter: number; cashDeclaredKobo: number },
    caller: Caller,
  ): Promise<ServiceResult<ShiftDoc>> {
    const shift = await this.shifts.findById(shiftId);
    if (!shift || shift.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'shift_not_found');
    if (shift.status !== 'open') return fail(ERROR_CODE.INVALID_STATE, 'shift_not_open');

    // Own-pump rule: an attendant with only CLOSE_OWN_SHIFT may close only their own pump.
    const canCloseAny = caller.permissions.has(P.CAN_CLOSE_ANY_SHIFT);
    const canCloseOwn = caller.permissions.has(P.CAN_CLOSE_OWN_SHIFT);
    const isOwn = shift.attendantId === caller.userId;
    if (!canCloseAny && !(canCloseOwn && isOwn)) {
      return fail(ERROR_CODE.FORBIDDEN, 'forbidden');
    }

    if (input.closingMeter < shift.openingMeter) {
      return fail(ERROR_CODE.BUSINESS_RULE, 'closing_below_opening', { field: 'closing_meter' });
    }

    const recon = reconcile(
      shift.openingMeter,
      input.closingMeter,
      shift.pricePerLitreKobo,
      input.cashDeclaredKobo,
    );

    const patch: Partial<ShiftDoc> = {
      closingMeter: input.closingMeter,
      litres: recon.litres,
      expectedGrossKobo: recon.expectedGrossKobo,
      cashDeclaredKobo: input.cashDeclaredKobo,
      varianceKobo: recon.varianceKobo,
      varianceStatus: recon.varianceStatus,
      status: 'closed',
      closedBy: caller.userId,
      closedAt: now(),
    };

    await withTransaction(async (tx) => {
      await this.shifts.update(shiftId, patch, tx);
      await this.pumps.update(shift.pumpId, { state: 'idle' });
      await this.audit.record(
        {
          orgId,
          branchId: shift.branchId,
          actorId: caller.userId,
          action: 'shift.closed',
          entityType: 'shift',
          entityId: shiftId,
          after: { closingMeter: input.closingMeter, varianceKobo: recon.varianceKobo },
        },
        tx,
      );
    });
    return ok({ ...shift, ...patch });
  }

  async post(orgId: string, shiftId: string, actorId: string): Promise<ServiceResult<ShiftDoc>> {
    const shift = await this.shifts.findById(shiftId);
    if (!shift || shift.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'shift_not_found');
    if (shift.status === 'posted') return fail(ERROR_CODE.INVALID_STATE, 'shift_already_posted');
    if (shift.status !== 'closed') return fail(ERROR_CODE.INVALID_STATE, 'shift_not_closed');

    // Branch rule: closing dip required before posting.
    const branch = await this.branches.findById(shift.branchId);
    if (branch?.settings.requireClosingDip) {
      const pump = await this.pumps.findById(shift.pumpId);
      const tank = pump ? await this.tanks.findByProduct(shift.branchId, pump.product) : null;
      if (tank) {
        const closingDip = await this.dips.findForDateTank(
          shift.branchId,
          shift.businessDate,
          tank._id,
          'closing',
        );
        if (!closingDip) return fail(ERROR_CODE.BUSINESS_RULE, 'branch_rule_unmet');
      }
    }

    const patch: Partial<ShiftDoc> = { status: 'posted', postedBy: actorId, postedAt: now() };
    await withTransaction(async (tx) => {
      await this.shifts.update(shiftId, patch, tx);
      await this.audit.record(
        {
          orgId,
          branchId: shift.branchId,
          actorId,
          action: 'shift.posted',
          entityType: 'shift',
          entityId: shiftId,
        },
        tx,
      );
    });
    return ok({ ...shift, ...patch });
  }

  async postBalanced(
    orgId: string,
    branchId: string,
    businessDate: string,
    actorId: string,
  ): Promise<ServiceResult<{ posted: number }>> {
    const balanced = await this.shifts.findBalancedClosed(branchId, businessDate);
    let posted = 0;
    for (const shift of balanced) {
      const result = await this.post(orgId, shift._id, actorId);
      if (result.success) posted += 1;
    }
    return ok({ posted });
  }

  // The VOID idiom. Posted shift only; literal word VOID required; reason audited; the
  // shift stays visible (status 'voided', struck through on the FE), never deleted.
  async voidShift(
    orgId: string,
    shiftId: string,
    input: { reason: string; confirm: string },
    actorId: string,
  ): Promise<ServiceResult<ShiftDoc>> {
    const shift = await this.shifts.findById(shiftId);
    if (!shift || shift.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'shift_not_found');
    if (shift.status === 'voided') return fail(ERROR_CODE.INVALID_STATE, 'shift_already_voided');
    if (shift.status !== 'posted') return fail(ERROR_CODE.INVALID_STATE, 'shift_not_posted');
    if (input.confirm !== 'VOID') {
      return fail(ERROR_CODE.VALIDATION, 'void_word_mismatch', { field: 'confirm' });
    }

    const patch: Partial<ShiftDoc> = {
      status: 'voided',
      voidedBy: actorId,
      voidedAt: now(),
      voidReason: input.reason,
    };
    await withTransaction(async (tx) => {
      await this.shifts.update(shiftId, patch, tx);
      await this.audit.record(
        {
          orgId,
          branchId: shift.branchId,
          actorId,
          action: 'shift.voided',
          entityType: 'shift',
          entityId: shiftId,
          before: { status: shift.status, varianceKobo: shift.varianceKobo },
          after: { status: 'voided' },
          note: input.reason,
        },
        tx,
      );
    });
    return ok({ ...shift, ...patch });
  }

  // --- dips ---

  async recordDip(
    orgId: string,
    branchId: string,
    input: { tankId: string; kind: 'opening' | 'closing'; litres: number; businessDate: string },
    actorId: string,
  ): Promise<ServiceResult<DipDoc>> {
    const tank = await this.tanks.findById(input.tankId);
    if (!tank || tank.branchId !== branchId)
      return fail(ERROR_CODE.NOT_FOUND, 'tank_not_found', { field: 'tank_id' });

    // Wet-stock variance on a closing dip: (opening + delivered - sold) vs the physical dip.
    let wetStockVarianceLitres: number | null = null;
    if (input.kind === 'closing') {
      const openingDip = await this.dips.findForDateTank(
        branchId,
        input.businessDate,
        input.tankId,
        'opening',
      );
      const opening = openingDip?.litres ?? tank.currentLitres;
      const sold = await this.dips.soldLitres(branchId, input.businessDate, tank.product);
      // currentLitres already reflects deliveries applied during the day.
      const expected = opening - sold;
      wetStockVarianceLitres = Math.round((input.litres - expected) * 100) / 100;
    }

    const ts = now();
    const doc: DipDoc = {
      _id: newId('dip'),
      orgId,
      branchId,
      tankId: input.tankId,
      product: tank.product,
      businessDate: input.businessDate,
      kind: input.kind,
      litres: input.litres,
      wetStockVarianceLitres,
      recordedBy: actorId,
      createdAt: ts,
      updatedAt: ts,
    };

    await withTransaction(async (tx) => {
      await this.dips.insert(doc, tx);
      // A dip is the physical truth — set the tank balance to the measured litres.
      await this.tanks.setBalance(input.tankId, input.litres, tx);
      await this.audit.record(
        {
          orgId,
          branchId,
          actorId,
          action: `dip.${input.kind}`,
          entityType: 'dip',
          entityId: doc._id,
          after: { tankId: input.tankId, litres: input.litres },
        },
        tx,
      );
    });
    return ok(doc);
  }

  // --- daybook ---

  async daybook(
    orgId: string,
    branchId: string,
    businessDate: string,
  ): Promise<ServiceResult<{ shifts: ShiftDoc[]; dips: DipDoc[]; tanks: TankDoc[] }>> {
    const branch = await this.branches.findById(branchId);
    if (!branch || branch.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'branch_not_found');
    const [shifts, dips, tanks] = await Promise.all([
      this.shifts.findByBranchDate(branchId, businessDate),
      this.dips.findByBranchDate(branchId, businessDate),
      this.tanks.findByBranch(branchId),
    ]);
    return ok({ shifts, dips, tanks });
  }
}

export const shiftsService = ShiftsService.getInstance();
