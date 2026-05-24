import { QK } from '@dipstick/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client.js';
import { EP } from '../endpoints.js';
import type { ApiResponse } from '../types/envelope.js';
import type {
  CreateBranchPayload,
  PumpInput,
  TankInput,
  UpdateBranchPayload,
  UpdatePumpPayload,
} from '../types/payloads.js';
import type { BranchDetailWire, BranchWire, PumpWire, TankWire } from '../types/wire.js';

export function useBranches() {
  return useQuery({
    queryKey: QK.branches(),
    queryFn: async () => {
      const res = await apiClient
        .get(EP.BRANCHES)
        .json<ApiResponse<{ items: BranchWire[] }>>();
      return res.data.items;
    },
  });
}

export function useBranch(branchId: string) {
  return useQuery({
    queryKey: QK.branch(branchId),
    enabled: branchId !== '',
    queryFn: async () => {
      const res = await apiClient
        .get(EP.BRANCH(branchId))
        .json<ApiResponse<BranchDetailWire>>();
      return res.data;
    },
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBranchPayload) => {
      const res = await apiClient
        .post(EP.BRANCHES, { json: payload })
        .json<ApiResponse<BranchDetailWire>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.branches() }),
  });
}

export function useUpdateBranch(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateBranchPayload) => {
      const res = await apiClient
        .patch(EP.BRANCH(branchId), { json: payload })
        .json<ApiResponse<BranchWire>>();
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.branch(branchId) });
      void qc.invalidateQueries({ queryKey: QK.branches() });
    },
  });
}

export function useArchiveBranch(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post(EP.BRANCH_ARCHIVE(branchId));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.branches() });
      void qc.invalidateQueries({ queryKey: QK.branch(branchId) });
    },
  });
}

export function useAddTank(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TankInput) => {
      const res = await apiClient
        .post(EP.BRANCH_TANKS(branchId), { json: payload })
        .json<ApiResponse<TankWire>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.branch(branchId) }),
  });
}

export function useUpdateTank(branchId: string, tankId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<TankInput>) => {
      const res = await apiClient
        .patch(EP.BRANCH_TANK(branchId, tankId), { json: payload })
        .json<ApiResponse<TankWire>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.branch(branchId) }),
  });
}

export function useAddPump(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PumpInput) => {
      const res = await apiClient
        .post(EP.BRANCH_PUMPS(branchId), { json: payload })
        .json<ApiResponse<PumpWire>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.branch(branchId) }),
  });
}

export function useUpdatePump(branchId: string, pumpId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdatePumpPayload) => {
      const res = await apiClient
        .patch(EP.BRANCH_PUMP(branchId, pumpId), { json: payload })
        .json<ApiResponse<PumpWire>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.branch(branchId) }),
  });
}
