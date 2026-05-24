import { QK } from '@dipstick/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client.js';
import { EP } from '../endpoints.js';
import type { ApiResponse } from '../types/envelope.js';
import type { RolePayload } from '../types/payloads.js';
import type { PermissionDefWire, RoleWire } from '../types/wire.js';

export function usePermissions() {
  return useQuery({
    queryKey: QK.permissions(),
    queryFn: async () => {
      const res = await apiClient
        .get(EP.PERMISSIONS)
        .json<ApiResponse<{ permissions: PermissionDefWire[] }>>();
      return res.data.permissions;
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: QK.roles(),
    queryFn: async () => {
      const res = await apiClient.get(EP.ROLES).json<ApiResponse<{ items: RoleWire[] }>>();
      return res.data.items;
    },
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RolePayload) => {
      const res = await apiClient.post(EP.ROLES, { json: payload }).json<ApiResponse<RoleWire>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.roles() }),
  });
}

export function useUpdateRole(roleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RolePayload) => {
      const res = await apiClient
        .patch(EP.ROLE(roleId), { json: payload })
        .json<ApiResponse<RoleWire>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.roles() }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roleId: string) => {
      await apiClient.delete(EP.ROLE(roleId));
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.roles() }),
  });
}
