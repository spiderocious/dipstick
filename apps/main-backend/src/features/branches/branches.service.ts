import type { BranchSettings, Product, PumpState } from '@dipstick/core';

import { withTransaction } from '@db/transaction.js';
import { newId } from '@lib/ids.js';
import { fail, ok, type ServiceResult } from '@lib/service-result.js';
import { ERROR_CODE } from '@shared/constants/error-codes.js';
import type { BranchDoc, PumpDoc, TankDoc } from '@shared/types/documents.js';

import { auditService, type AuditService } from '../audit/audit.service.js';
import type { MembershipRepo } from '../auth/auth.repo.js';
import { membershipRepo } from '../auth/auth.repo.mongo.js';
import type { BranchRepo, PumpRepo, TankRepo } from './branches.repo.js';
import { branchRepo, pumpRepo, tankRepo } from './branches.repo.mongo.js';

const now = (): string => new Date().toISOString();

const DEFAULT_SETTINGS: BranchSettings = {
  requireClosingDip: true,
  varianceFlagKobo: 500_000, // ₦5,000
  managerMaySetPrice: false,
  deliveryToleranceLitres: 200,
};

export interface CreateBranchInput {
  name: string;
  city: string;
  state: string;
  tanks?: Array<{ product: Product; capacityLitres: number; reorderThresholdLitres: number }>;
  pumps?: Array<{ product: Product; label: string }>;
}

export class BranchesService {
  private constructor(
    private readonly branches: BranchRepo = branchRepo,
    private readonly tanks: TankRepo = tankRepo,
    private readonly pumps: PumpRepo = pumpRepo,
    private readonly memberships: MembershipRepo = membershipRepo,
    private readonly audit: AuditService = auditService,
  ) {}
  private static instance: BranchesService;
  static getInstance(): BranchesService {
    if (!BranchesService.instance) BranchesService.instance = new BranchesService();
    return BranchesService.instance;
  }

  // List the branches a user can see: all org branches if they hold an org-wide ('*')
  // membership, otherwise only the branches they are a member of.
  async listForUser(orgId: string, userId: string): Promise<BranchDoc[]> {
    const mine = await this.memberships.findByOrgAndUser(orgId, userId);
    const orgWide = mine.some((m) => m.branchId === '*');
    if (orgWide) return this.branches.findByOrg(orgId, null);
    const branchIds = mine
      .map((m) => m.branchId)
      .filter((b): b is string => b !== '*');
    if (branchIds.length === 0) return [];
    return this.branches.findByOrg(orgId, branchIds);
  }

  async getDetail(
    orgId: string,
    branchId: string,
  ): Promise<ServiceResult<{ branch: BranchDoc; tanks: TankDoc[]; pumps: PumpDoc[] }>> {
    const branch = await this.branches.findById(branchId);
    if (!branch || branch.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'branch_not_found');
    const [tanks, pumps] = await Promise.all([
      this.tanks.findByBranch(branchId),
      this.pumps.findByBranch(branchId),
    ]);
    return ok({ branch, tanks, pumps });
  }

  async create(
    orgId: string,
    input: CreateBranchInput,
    actorId: string,
  ): Promise<ServiceResult<{ branch: BranchDoc; tanks: TankDoc[]; pumps: PumpDoc[] }>> {
    // One tank per product.
    const products = (input.tanks ?? []).map((t) => t.product);
    if (new Set(products).size !== products.length) {
      return fail(ERROR_CODE.CONFLICT, 'tank_product_exists', { field: 'tanks' });
    }

    const ts = now();
    const branchId = newId('branch');
    const branch: BranchDoc = {
      _id: branchId,
      orgId,
      name: input.name,
      city: input.city,
      state: input.state,
      isArchived: false,
      archivedAt: null,
      settings: { ...DEFAULT_SETTINGS },
      createdAt: ts,
      updatedAt: ts,
    };
    const tankDocs: TankDoc[] = (input.tanks ?? []).map((t) => ({
      _id: newId('tank'),
      orgId,
      branchId,
      product: t.product,
      capacityLitres: t.capacityLitres,
      reorderThresholdLitres: t.reorderThresholdLitres,
      currentLitres: 0,
      createdAt: ts,
      updatedAt: ts,
    }));
    const pumpDocs: PumpDoc[] = (input.pumps ?? []).map((p) => ({
      _id: newId('pump'),
      orgId,
      branchId,
      product: p.product,
      label: p.label,
      state: 'idle',
      faultNote: null,
      createdAt: ts,
      updatedAt: ts,
    }));

    await withTransaction(async (tx) => {
      await this.branches.insert(branch, tx);
      for (const t of tankDocs) await this.tanks.insert(t, tx);
      for (const p of pumpDocs) await this.pumps.insert(p, tx);
      await this.audit.record(
        {
          orgId,
          branchId,
          actorId,
          action: 'branch.created',
          entityType: 'branch',
          entityId: branchId,
          after: { name: branch.name },
        },
        tx,
      );
    });

    return ok({ branch, tanks: tankDocs, pumps: pumpDocs });
  }

  async update(
    orgId: string,
    branchId: string,
    patch: {
      name?: string;
      city?: string;
      state?: string;
      settings?: Partial<BranchSettings>;
    },
    actorId: string,
  ): Promise<ServiceResult<BranchDoc>> {
    const branch = await this.branches.findById(branchId);
    if (!branch || branch.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'branch_not_found');

    const next: Partial<Pick<BranchDoc, 'name' | 'city' | 'state' | 'settings'>> = {};
    if (patch.name !== undefined) next.name = patch.name;
    if (patch.city !== undefined) next.city = patch.city;
    if (patch.state !== undefined) next.state = patch.state;
    if (patch.settings) next.settings = { ...branch.settings, ...patch.settings };

    await this.branches.update(branchId, next);
    await this.audit.record({
      orgId,
      branchId,
      actorId,
      action: 'branch.updated',
      entityType: 'branch',
      entityId: branchId,
      before: { name: branch.name, settings: branch.settings },
      after: next,
    });
    return ok({ ...branch, ...next });
  }

  async archive(orgId: string, branchId: string, actorId: string): Promise<ServiceResult<null>> {
    const branch = await this.branches.findById(branchId);
    if (!branch || branch.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'branch_not_found');
    await this.branches.setArchived(branchId, true, now());
    await this.audit.record({
      orgId,
      branchId,
      actorId,
      action: 'branch.archived',
      entityType: 'branch',
      entityId: branchId,
    });
    return ok(null);
  }

  // --- tanks ---

  async addTank(
    orgId: string,
    branchId: string,
    input: { product: Product; capacityLitres: number; reorderThresholdLitres: number },
    actorId: string,
  ): Promise<ServiceResult<TankDoc>> {
    const branch = await this.requireLiveBranch(orgId, branchId);
    if (!branch.success) return branch;
    if (await this.tanks.findByProduct(branchId, input.product)) {
      return fail(ERROR_CODE.CONFLICT, 'tank_product_exists', { field: 'product' });
    }
    const ts = now();
    const tank: TankDoc = {
      _id: newId('tank'),
      orgId,
      branchId,
      product: input.product,
      capacityLitres: input.capacityLitres,
      reorderThresholdLitres: input.reorderThresholdLitres,
      currentLitres: 0,
      createdAt: ts,
      updatedAt: ts,
    };
    await this.tanks.insert(tank);
    await this.audit.record({
      orgId,
      branchId,
      actorId,
      action: 'tank.created',
      entityType: 'tank',
      entityId: tank._id,
      after: { product: tank.product },
    });
    return ok(tank);
  }

  async updateTank(
    orgId: string,
    tankId: string,
    patch: { capacityLitres?: number; reorderThresholdLitres?: number },
    actorId: string,
  ): Promise<ServiceResult<TankDoc>> {
    const tank = await this.tanks.findById(tankId);
    if (!tank || tank.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'tank_not_found');
    const next: { capacityLitres?: number; reorderThresholdLitres?: number } = {};
    if (patch.capacityLitres !== undefined) next.capacityLitres = patch.capacityLitres;
    if (patch.reorderThresholdLitres !== undefined)
      next.reorderThresholdLitres = patch.reorderThresholdLitres;
    await this.tanks.update(tankId, next);
    await this.audit.record({
      orgId,
      branchId: tank.branchId,
      actorId,
      action: 'tank.updated',
      entityType: 'tank',
      entityId: tankId,
      before: { capacityLitres: tank.capacityLitres },
      after: next,
    });
    return ok({ ...tank, ...next });
  }

  // --- pumps ---

  async addPump(
    orgId: string,
    branchId: string,
    input: { product: Product; label: string },
    actorId: string,
  ): Promise<ServiceResult<PumpDoc>> {
    const branch = await this.requireLiveBranch(orgId, branchId);
    if (!branch.success) return branch;
    const ts = now();
    const pump: PumpDoc = {
      _id: newId('pump'),
      orgId,
      branchId,
      product: input.product,
      label: input.label,
      state: 'idle',
      faultNote: null,
      createdAt: ts,
      updatedAt: ts,
    };
    await this.pumps.insert(pump);
    await this.audit.record({
      orgId,
      branchId,
      actorId,
      action: 'pump.created',
      entityType: 'pump',
      entityId: pump._id,
      after: { label: pump.label },
    });
    return ok(pump);
  }

  async updatePump(
    orgId: string,
    pumpId: string,
    patch: { label?: string; state?: PumpState; faultNote?: string | null },
    actorId: string,
  ): Promise<ServiceResult<PumpDoc>> {
    const pump = await this.pumps.findById(pumpId);
    if (!pump || pump.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'pump_not_found');
    const next: { label?: string; state?: PumpState; faultNote?: string | null } = {};
    if (patch.label !== undefined) next.label = patch.label;
    if (patch.state !== undefined) next.state = patch.state;
    // A fault note only makes sense when offline; clear it otherwise.
    if (patch.state === 'offline') next.faultNote = patch.faultNote ?? null;
    else if (patch.state !== undefined) next.faultNote = null;
    else if (patch.faultNote !== undefined) next.faultNote = patch.faultNote;
    await this.pumps.update(pumpId, next);
    await this.audit.record({
      orgId,
      branchId: pump.branchId,
      actorId,
      action: 'pump.updated',
      entityType: 'pump',
      entityId: pumpId,
      before: { state: pump.state },
      after: next,
    });
    return ok({ ...pump, ...next });
  }

  private async requireLiveBranch(
    orgId: string,
    branchId: string,
  ): Promise<ServiceResult<BranchDoc>> {
    const branch = await this.branches.findById(branchId);
    if (!branch || branch.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'branch_not_found');
    if (branch.isArchived) return fail(ERROR_CODE.INVALID_STATE, 'branch_archived');
    return ok(branch);
  }
}

export const branchesService = BranchesService.getInstance();
