import { formatNaira } from '@dipstick/core';

import { fail, ok, type ServiceResult } from '@lib/service-result.js';
import { ERROR_CODE } from '@shared/constants/error-codes.js';
import type { BranchDoc, TankDoc } from '@shared/types/documents.js';

import type { BranchRepo, TankRepo } from '../branches/branches.repo.js';
import { branchRepo, tankRepo } from '../branches/branches.repo.mongo.js';
import type { MembershipRepo } from '../auth/auth.repo.js';
import { membershipRepo } from '../auth/auth.repo.mongo.js';
import { rollupRepo, type BranchDayTotals, type RollupRepo } from './rollup.repo.js';

// Yesterday in ISO date (YYYY-MM-DD).
const yesterdayIso = (): string => {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
};

const addDaysIso = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export interface BranchRollup {
  branch: BranchDoc;
  totals: BranchDayTotals;
  status: 'clean' | 'short' | 'reorder';
  tanksBelowReorder: TankDoc[];
}

export interface RollupResult {
  businessDate: string;
  lead: string;
  totals: { litres: number; grossKobo: number; varianceKobo: number };
  branches: BranchRollup[];
  todo: Array<{ kind: string; branchId: string; message: string }>;
}

export class RollupService {
  private constructor(
    private readonly branches: BranchRepo = branchRepo,
    private readonly tanks: TankRepo = tankRepo,
    private readonly memberships: MembershipRepo = membershipRepo,
    private readonly rollup: RollupRepo = rollupRepo,
  ) {}
  private static instance: RollupService;
  static getInstance(): RollupService {
    if (!RollupService.instance) RollupService.instance = new RollupService();
    return RollupService.instance;
  }

  private async visibleBranches(orgId: string, userId: string): Promise<BranchDoc[]> {
    const mine = await this.memberships.findByOrgAndUser(orgId, userId);
    if (mine.some((m) => m.branchId === '*')) return this.branches.findByOrg(orgId, null);
    const ids = mine.map((m) => m.branchId).filter((b): b is string => b !== '*');
    return ids.length ? this.branches.findByOrg(orgId, ids) : [];
  }

  async morning(
    orgId: string,
    userId: string,
    date?: string,
  ): Promise<ServiceResult<RollupResult>> {
    const businessDate = date ?? yesterdayIso();
    const branches = (await this.visibleBranches(orgId, userId)).filter((b) => !b.isArchived);
    if (branches.length === 0) {
      return ok({
        businessDate,
        lead: 'No branches to report on yet.',
        totals: { litres: 0, grossKobo: 0, varianceKobo: 0 },
        branches: [],
        todo: [],
      });
    }

    const branchIds = branches.map((b) => b._id);
    const totalsByBranch = new Map(
      (await this.rollup.branchDayTotals(branchIds, businessDate)).map((t) => [t.branchId, t]),
    );

    const todo: RollupResult['todo'] = [];
    const branchRollups: BranchRollup[] = await Promise.all(
      branches.map(async (branch) => {
        const totals: BranchDayTotals =
          totalsByBranch.get(branch._id) ??
          {
            branchId: branch._id,
            litres: 0,
            grossKobo: 0,
            varianceKobo: 0,
            shiftCount: 0,
            shortCount: 0,
          };
        const tanks = await this.tanks.findByBranch(branch._id);
        const tanksBelowReorder = tanks.filter(
          (t) => t.currentLitres <= t.reorderThresholdLitres,
        );

        let status: BranchRollup['status'] = 'clean';
        if (tanksBelowReorder.length > 0) status = 'reorder';
        else if (totals.shortCount > 0) status = 'short';

        if (totals.shortCount > 0) {
          todo.push({
            kind: 'shortage',
            branchId: branch._id,
            message: `${branch.name}: ${totals.shortCount} short shift(s) to review (${formatNaira(Math.abs(totals.varianceKobo))}).`,
          });
        }
        for (const tank of tanksBelowReorder) {
          todo.push({
            kind: 'reorder',
            branchId: branch._id,
            message: `${branch.name}: ${tank.product} tank below reorder threshold — order a delivery.`,
          });
        }
        return { branch, totals, status, tanksBelowReorder };
      }),
    );

    const totals = branchRollups.reduce(
      (acc, b) => ({
        litres: acc.litres + b.totals.litres,
        grossKobo: acc.grossKobo + b.totals.grossKobo,
        varianceKobo: acc.varianceKobo + b.totals.varianceKobo,
      }),
      { litres: 0, grossKobo: 0, varianceKobo: 0 },
    );

    const lead = this.buildLead(branchRollups.length, totals, todo.length);
    return ok({ businessDate, lead, totals, branches: branchRollups, todo });
  }

  private buildLead(
    branchCount: number,
    totals: { litres: number; grossKobo: number; varianceKobo: number },
    todoCount: number,
  ): string {
    const variance =
      totals.varianceKobo === 0
        ? 'balanced'
        : totals.varianceKobo > 0
          ? `${formatNaira(totals.varianceKobo)} short`
          : `${formatNaira(Math.abs(totals.varianceKobo))} over`;
    const tail = todoCount === 0 ? 'Nothing needs your attention.' : `${todoCount} item(s) to review.`;
    return `Across ${branchCount} branch(es): ${Math.round(totals.litres)} L sold, ${formatNaira(totals.grossKobo)} gross, ${variance}. ${tail}`;
  }

  async trends(
    orgId: string,
    userId: string,
    days: number,
  ): Promise<ServiceResult<{ from: string; to: string; series: Array<{ branchId: string; branchName: string; points: Array<{ date: string; litres: number }> }> }>> {
    const branches = (await this.visibleBranches(orgId, userId)).filter((b) => !b.isArchived);
    const to = yesterdayIso();
    const from = addDaysIso(to, -(days - 1));
    const series = await Promise.all(
      branches.map(async (branch) => ({
        branchId: branch._id,
        branchName: branch.name,
        points: await this.rollup.litresPerDay(branch._id, from, to),
      })),
    );
    return ok({ from, to, series });
  }

  // Guard used by the controller so a clearer message is returned when nothing is visible.
  async requireAccess(orgId: string, userId: string): Promise<ServiceResult<null>> {
    const mine = await this.memberships.findByOrgAndUser(orgId, userId);
    if (mine.length === 0) return fail(ERROR_CODE.FORBIDDEN, 'forbidden');
    return ok(null);
  }
}

export const rollupService = RollupService.getInstance();
