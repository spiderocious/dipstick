import type { Collection } from 'mongodb';

import { getDb } from '@db/client.js';
import { COLLECTION } from '@db/collections.js';
import type { ShiftDoc } from '@shared/types/documents.js';

// Read-only aggregation for the roll-up. Lives in the rollup feature; reads the shifts
// collection. No writes.
export interface BranchDayTotals {
  branchId: string;
  litres: number;
  grossKobo: number;
  varianceKobo: number;
  shiftCount: number;
  shortCount: number;
}

export interface RollupRepo {
  branchDayTotals(branchIds: string[], businessDate: string): Promise<BranchDayTotals[]>;
  litresPerDay(branchId: string, fromDate: string, toDate: string): Promise<Array<{ date: string; litres: number }>>;
}

const shifts = (): Collection<ShiftDoc> => getDb().collection<ShiftDoc>(COLLECTION.shifts);

export const rollupRepo: RollupRepo = {
  branchDayTotals: async (branchIds, businessDate) => {
    if (branchIds.length === 0) return [];
    const rows = await shifts()
      .aggregate<{
        _id: string;
        litres: number;
        grossKobo: number;
        varianceKobo: number;
        shiftCount: number;
        shortCount: number;
      }>([
        {
          $match: {
            branchId: { $in: branchIds },
            businessDate,
            status: { $in: ['posted', 'closed'] },
          },
        },
        {
          $group: {
            _id: '$branchId',
            litres: { $sum: { $ifNull: ['$litres', 0] } },
            grossKobo: { $sum: { $ifNull: ['$expectedGrossKobo', 0] } },
            varianceKobo: { $sum: { $ifNull: ['$varianceKobo', 0] } },
            shiftCount: { $sum: 1 },
            shortCount: {
              $sum: { $cond: [{ $eq: ['$varianceStatus', 'short'] }, 1, 0] },
            },
          },
        },
      ])
      .toArray();
    return rows.map((r) => ({
      branchId: r._id,
      litres: r.litres,
      grossKobo: r.grossKobo,
      varianceKobo: r.varianceKobo,
      shiftCount: r.shiftCount,
      shortCount: r.shortCount,
    }));
  },

  litresPerDay: async (branchId, fromDate, toDate) => {
    const rows = await shifts()
      .aggregate<{ _id: string; litres: number }>([
        {
          $match: {
            branchId,
            businessDate: { $gte: fromDate, $lte: toDate },
            status: { $in: ['posted', 'closed'] },
          },
        },
        { $group: { _id: '$businessDate', litres: { $sum: { $ifNull: ['$litres', 0] } } } },
        { $sort: { _id: 1 } },
      ])
      .toArray();
    return rows.map((r) => ({ date: r._id, litres: r.litres }));
  },
};
