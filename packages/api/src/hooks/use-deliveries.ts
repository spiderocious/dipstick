import { QK } from '@dipstick/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client.js';
import { EP } from '../endpoints.js';
import type { ApiResponse } from '../types/envelope.js';
import type {
  RecordDeliveryPayload,
  SignDeliveryPayload,
  StepDeliveryPayload,
} from '../types/payloads.js';
import type { DeliveryWire, PageMeta } from '../types/wire.js';

export function useDeliveries(branchId: string) {
  return useQuery({
    queryKey: QK.deliveries(branchId),
    enabled: branchId !== '',
    queryFn: async () => {
      const res = await apiClient
        .get(EP.DELIVERIES(branchId))
        .json<ApiResponse<{ items: DeliveryWire[] }> & { meta?: PageMeta }>();
      return res.data.items;
    },
  });
}

export function useDelivery(deliveryId: string) {
  return useQuery({
    queryKey: QK.delivery(deliveryId),
    enabled: deliveryId !== '',
    queryFn: async () => {
      const res = await apiClient
        .get(EP.DELIVERY(deliveryId))
        .json<ApiResponse<DeliveryWire>>();
      return res.data;
    },
  });
}

export function useRecordDelivery(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RecordDeliveryPayload) => {
      const res = await apiClient
        .post(EP.DELIVERIES(branchId), { json: payload })
        .json<ApiResponse<DeliveryWire>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.deliveries(branchId) }),
  });
}

export function useStepDelivery(deliveryId: string, branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: StepDeliveryPayload) => {
      const res = await apiClient
        .patch(EP.DELIVERY(deliveryId), { json: payload })
        .json<ApiResponse<DeliveryWire>>();
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.delivery(deliveryId) });
      void qc.invalidateQueries({ queryKey: QK.deliveries(branchId) });
    },
  });
}

export function useSignDelivery(deliveryId: string, branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SignDeliveryPayload) => {
      const res = await apiClient
        .post(EP.DELIVERY_SIGN(deliveryId), { json: payload })
        .json<ApiResponse<DeliveryWire>>();
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.delivery(deliveryId) });
      void qc.invalidateQueries({ queryKey: QK.deliveries(branchId) });
    },
  });
}
