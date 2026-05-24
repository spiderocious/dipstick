import { QK } from '@dipstick/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client.js';
import { EP } from '../endpoints.js';
import type { ApiResponse } from '../types/envelope.js';
import type { AddNotePayload } from '../types/payloads.js';
import type { AuditEntryWire, NoteWire, PageMeta } from '../types/wire.js';

export function useNotes(entityType: string, entityId: string) {
  return useQuery({
    queryKey: QK.notes(entityType, entityId),
    enabled: entityType !== '' && entityId !== '',
    queryFn: async () => {
      const res = await apiClient
        .get(EP.NOTES(entityType, entityId))
        .json<ApiResponse<{ items: NoteWire[] }> & { meta?: PageMeta }>();
      return res.data.items;
    },
  });
}

export function useAddNote(entityType: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddNotePayload) => {
      const res = await apiClient
        .post(EP.NOTES(entityType, entityId), { json: payload })
        .json<ApiResponse<NoteWire>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.notes(entityType, entityId) }),
  });
}

export function useAudit(branchId: string) {
  return useQuery({
    queryKey: QK.audit(branchId),
    enabled: branchId !== '',
    queryFn: async () => {
      const res = await apiClient
        .get(EP.AUDIT(branchId))
        .json<ApiResponse<{ items: AuditEntryWire[] }> & { meta?: PageMeta }>();
      return res.data.items;
    },
  });
}
