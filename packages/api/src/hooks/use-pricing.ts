import { QK } from '@dipstick/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client.js';
import { EP } from '../endpoints.js';
import type { ApiResponse } from '../types/envelope.js';
import type { PricePreviewPayload, SetPricePayload } from '../types/payloads.js';
import type { CurrentPriceWire, PricePreviewWire, PriceWire } from '../types/wire.js';

export function usePrices(branchId: string) {
  return useQuery({
    queryKey: QK.prices(branchId),
    enabled: branchId !== '',
    queryFn: async () => {
      const res = await apiClient
        .get(EP.PRICES(branchId))
        .json<ApiResponse<{ items: CurrentPriceWire[] }>>();
      return res.data.items;
    },
  });
}

export function usePriceHistory(branchId: string, product: string) {
  return useQuery({
    queryKey: QK.priceHistory(branchId, product),
    enabled: branchId !== '' && product !== '',
    queryFn: async () => {
      const res = await apiClient
        .get(EP.PRICE_HISTORY(branchId, product))
        .json<ApiResponse<{ items: PriceWire[] }>>();
      return res.data.items;
    },
  });
}

export function usePricePreview(branchId: string) {
  return useMutation({
    mutationFn: async (payload: PricePreviewPayload) => {
      const res = await apiClient
        .post(EP.PRICE_PREVIEW(branchId), { json: payload })
        .json<ApiResponse<PricePreviewWire>>();
      return res.data;
    },
  });
}

export function useSetPrice(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SetPricePayload) => {
      const res = await apiClient
        .post(EP.PRICES(branchId), { json: payload })
        .json<ApiResponse<PriceWire>>();
      return res.data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: QK.prices(branchId) });
      void qc.invalidateQueries({ queryKey: QK.priceHistory(branchId, data.product) });
    },
  });
}
