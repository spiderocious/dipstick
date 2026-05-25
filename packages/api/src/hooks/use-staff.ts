import { QK } from '@dipstick/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client.js';
import { EP } from '../endpoints.js';
import type { ApiResponse } from '../types/envelope.js';
import type {
  AddStaffPayload,
  AssignBranchPayload,
  EditAccountPayload,
  RosterPayload,
  UpdateStaffPayload,
} from '../types/payloads.js';
import type {
  AuditEntryWire,
  MembershipWire,
  PageMeta,
  RefMap,
  RosterWire,
  StaffDetailWire,
  StaffMemberWire,
  UserWire,
  VarianceLeaderRowWire,
} from '../types/wire.js';

export function useStaff(branchId: string) {
  return useQuery({
    queryKey: QK.staff(branchId),
    enabled: branchId !== '',
    queryFn: async () => {
      const res = await apiClient
        .get(EP.STAFF(branchId))
        .json<ApiResponse<{ items: StaffMemberWire[] }>>();
      return res.data.items;
    },
  });
}

export function useAddStaff(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddStaffPayload) => {
      const res = await apiClient
        .post(EP.STAFF(branchId), { json: payload })
        .json<ApiResponse<MembershipWire & { user: UserWire }>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.staff(branchId) }),
  });
}

export function useUpdateStaff(branchId: string, membershipId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateStaffPayload) => {
      const res = await apiClient
        .patch(EP.STAFF_MEMBER(membershipId), { json: payload })
        .json<ApiResponse<MembershipWire>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.staff(branchId) }),
  });
}

export function useRoster(branchId: string, weekStart: string) {
  return useQuery({
    queryKey: QK.roster(branchId, weekStart),
    enabled: branchId !== '' && weekStart !== '',
    queryFn: async () => {
      const res = await apiClient
        .get(EP.ROSTER(branchId), { searchParams: { week_start: weekStart } })
        .json<ApiResponse<RosterWire>>();
      return res.data;
    },
  });
}

export function useSaveRoster(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RosterPayload) => {
      const res = await apiClient
        .put(EP.ROSTER(branchId), { json: payload })
        .json<ApiResponse<RosterWire>>();
      return res.data;
    },
    onSuccess: (data) =>
      void qc.invalidateQueries({ queryKey: QK.roster(branchId, data.week_start) }),
  });
}

export function useVarianceLeaderboard(branchId: string) {
  return useQuery({
    queryKey: QK.varianceLeaderboard(branchId),
    enabled: branchId !== '',
    queryFn: async () => {
      const res = await apiClient
        .get(EP.VARIANCE_LEADERBOARD(branchId))
        .json<ApiResponse<{ items: VarianceLeaderRowWire[] }>>();
      return res.data.items;
    },
  });
}

// --- Per-person staff detail surface ---

export function useStaffDetail(userId: string) {
  return useQuery({
    queryKey: QK.staffDetail(userId),
    enabled: userId !== '',
    queryFn: async () => {
      const res = await apiClient
        .get(EP.STAFF_DETAIL(userId))
        .json<ApiResponse<StaffDetailWire>>();
      return res.data;
    },
  });
}

export function useStaffActivity(userId: string) {
  return useQuery({
    queryKey: QK.staffActivity(userId),
    enabled: userId !== '',
    queryFn: async () => {
      const res = await apiClient
        .get(EP.STAFF_ACTIVITY(userId))
        .json<ApiResponse<{ items: AuditEntryWire[] }> & { meta?: PageMeta }>();
      return { items: res.data.items, refs: (res.refs ?? {}) as RefMap };
    },
  });
}

// Assign an existing person to another branch (additive membership). Invalidates the target
// branch's staff list + the person's detail.
export function useAssignBranch(branchId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AssignBranchPayload) => {
      const res = await apiClient
        .post(EP.STAFF_ASSIGN(branchId, userId), { json: payload })
        .json<ApiResponse<MembershipWire>>();
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.staff(branchId) });
      void qc.invalidateQueries({ queryKey: QK.staffDetail(userId) });
    },
  });
}

export function useResetPassword(userId: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient
        .post(EP.STAFF_RESET_PASSWORD(userId))
        .json<ApiResponse<{ reset: boolean; temp_password?: string }>>();
      return res.data;
    },
  });
}

export function useEditAccount(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EditAccountPayload) => {
      const res = await apiClient
        .patch(EP.STAFF_ACCOUNT(userId), { json: payload })
        .json<ApiResponse<UserWire>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.staffDetail(userId) }),
  });
}
