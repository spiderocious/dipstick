import { QK } from '@dipstick/core';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../client.js';
import { EP } from '../endpoints.js';
import type { ApiResponse } from '../types/envelope.js';
import type { RollupWire, TrendsWire } from '../types/wire.js';

const DEFAULT_DATE = '' as const;

/** Roll-up for a date (omit/empty → backend defaults to yesterday). */
export function useRollup(date: string = DEFAULT_DATE) {
  return useQuery({
    queryKey: QK.rollup(date),
    queryFn: async () => {
      const searchParams = date !== DEFAULT_DATE ? { date } : undefined;
      const res = await apiClient
        .get(EP.ROLLUP, searchParams !== undefined ? { searchParams } : {})
        .json<ApiResponse<RollupWire>>();
      return res.data;
    },
  });
}

export function useRollupTrends(days = 7) {
  return useQuery({
    queryKey: QK.rollupTrends(days),
    queryFn: async () => {
      const res = await apiClient
        .get(EP.ROLLUP_TRENDS, { searchParams: { days } })
        .json<ApiResponse<TrendsWire>>();
      return res.data;
    },
  });
}
