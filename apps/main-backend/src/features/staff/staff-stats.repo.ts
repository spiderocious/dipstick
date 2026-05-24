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

export interface StaffStatsRepo {
  // Per-attendant shift count + cumulative variance over the last `sinceDays` days, branch-scoped.
  attendantStats(branchId: string, sinceDays: number): Promise<AttendantStat[]>;
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
};
