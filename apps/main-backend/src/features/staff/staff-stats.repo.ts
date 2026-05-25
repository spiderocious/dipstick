import type { Collection } from 'mongodb';

import { getDb } from '@db/client.js';
import { COLLECTION } from '@db/collections.js';
import type { ShiftDoc } from '@shared/types/documents.js';

// Read-only aggregation over posted shifts for the staff directory + variance leaderboard.
// Lives in the staff feature (it is a staff concern) but reads the shifts collection
// directly — a deliberate read-only seam, not a write path.
export interface AttendantStat {
  attendantId: string;
  shiftCount: number;
  netVarianceKobo: number;
}

export interface UserTotals {
  shiftCountTotal: number;
  shiftCount30d: number;
  varianceKobo30d: number;
}

export interface StaffStatsRepo {
  // Per-attendant shift count + cumulative variance over the last `sinceDays` days, branch-scoped.
  attendantStats(branchId: string, sinceDays: number): Promise<AttendantStat[]>;
  // One person's totals across ALL branches in the org (staff detail metrics).
  userTotals(orgId: string, userId: string): Promise<UserTotals>;
}

const shifts = (): Collection<ShiftDoc> => getDb().collection<ShiftDoc>(COLLECTION.shifts);

export const staffStatsRepo: StaffStatsRepo = {
  attendantStats: async (branchId, sinceDays) => {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
    const rows = await shifts()
      .aggregate<{ _id: string; shiftCount: number; netVarianceKobo: number }>([
        {
          $match: {
            branchId,
            status: { $in: ['posted', 'voided'] },
            postedAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: '$attendantId',
            shiftCount: { $sum: 1 },
            netVarianceKobo: { $sum: { $ifNull: ['$varianceKobo', 0] } },
          },
        },
      ])
      .toArray();
    return rows.map((r) => ({
      attendantId: r._id,
      shiftCount: r.shiftCount,
      netVarianceKobo: r.netVarianceKobo,
    }));
  },

  userTotals: async (orgId, userId) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const rows = await shifts()
      .aggregate<{ _id: null; total: number; recent: number; varianceKobo: number }>([
        { $match: { orgId, attendantId: userId, status: { $in: ['posted', 'voided'] } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            recent: { $sum: { $cond: [{ $gte: ['$postedAt', since] }, 1, 0] } },
            varianceKobo: {
              $sum: {
                $cond: [{ $gte: ['$postedAt', since] }, { $ifNull: ['$varianceKobo', 0] }, 0],
              },
            },
          },
        },
      ])
      .toArray();
    const r = rows[0];
    return {
      shiftCountTotal: r?.total ?? 0,
      shiftCount30d: r?.recent ?? 0,
      varianceKobo30d: r?.varianceKobo ?? 0,
    };
  },
};
