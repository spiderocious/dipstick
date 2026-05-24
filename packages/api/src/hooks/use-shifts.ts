import { QK } from '@dipstick/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client.js';
import { EP } from '../endpoints.js';
import type { ApiResponse } from '../types/envelope.js';
import type {
  CloseShiftPayload,
  DipPayload,
  OpenShiftPayload,
  VoidShiftPayload,
} from '../types/payloads.js';
import type { DaybookWire, DipWire, ShiftWire } from '../types/wire.js';

export function useDaybook(branchId: string, date: string) {
  return useQuery({
    queryKey: QK.daybook(branchId, date),
    enabled: branchId !== '' && date !== '',
    queryFn: async () => {
      const res = await apiClient
        .get(EP.DAYBOOK(branchId), { searchParams: { date } })
        .json<ApiResponse<DaybookWire>>();
      return res.data;
    },
  });
}

export function useShift(shiftId: string) {
  return useQuery({
    queryKey: QK.shift(shiftId),
    enabled: shiftId !== '',
    queryFn: async () => {
      const res = await apiClient.get(EP.SHIFT(shiftId)).json<ApiResponse<ShiftWire>>();
      return res.data;
    },
  });
}

export function useRecordDip(branchId: string, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DipPayload) => {
      const res = await apiClient
        .post(EP.DIPS(branchId), { json: payload })
        .json<ApiResponse<DipWire>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.daybook(branchId, date) }),
  });
}

export function useOpenShift(branchId: string, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: OpenShiftPayload) => {
      const res = await apiClient
        .post(EP.SHIFTS(branchId), { json: payload })
        .json<ApiResponse<ShiftWire>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.daybook(branchId, date) }),
  });
}

export function useCloseShift(shiftId: string, branchId: string, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CloseShiftPayload) => {
      const res = await apiClient
        .patch(EP.SHIFT(shiftId), { json: payload })
        .json<ApiResponse<ShiftWire>>();
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.shift(shiftId) });
      void qc.invalidateQueries({ queryKey: QK.daybook(branchId, date) });
    },
  });
}

export function usePostShift(shiftId: string, branchId: string, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(EP.SHIFT_POST(shiftId)).json<ApiResponse<ShiftWire>>();
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.shift(shiftId) });
      void qc.invalidateQueries({ queryKey: QK.daybook(branchId, date) });
    },
  });
}

export function usePostBalanced(branchId: string, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient
        .post(EP.SHIFTS_POST_BALANCED(branchId), { json: { business_date: date } })
        .json<ApiResponse<{ posted: number }>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.daybook(branchId, date) }),
  });
}

export function useVoidShift(shiftId: string, branchId: string, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VoidShiftPayload) => {
      const res = await apiClient
        .post(EP.SHIFT_VOID(shiftId), { json: payload })
        .json<ApiResponse<ShiftWire>>();
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.shift(shiftId) });
      void qc.invalidateQueries({ queryKey: QK.daybook(branchId, date) });
    },
  });
}
