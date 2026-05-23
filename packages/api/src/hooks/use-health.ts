import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../client.js';
import { EP } from '../endpoints.js';
import type { ApiResponse } from '../types/envelope.js';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  db: 'ok' | 'error';
  cache: 'ok' | 'error';
}

export const useHealth = () =>
  useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await apiClient.get(EP.HEALTH).json<ApiResponse<HealthStatus>>();
      return res.data;
    },
    refetchInterval: 30_000,
  });
