import { QK } from '@dipstick/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client.js';
import { EP } from '../endpoints.js';
import type { ApiResponse } from '../types/envelope.js';
import type { NotificationWire, PageMeta } from '../types/wire.js';

interface NotificationsData {
  items: NotificationWire[];
  unread_count: number;
}

export function useNotifications() {
  return useQuery({
    queryKey: QK.notifications(),
    queryFn: async () => {
      const res = await apiClient
        .get(EP.NOTIFICATIONS)
        .json<ApiResponse<NotificationsData> & { meta?: PageMeta }>();
      return res.data;
    },
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient
        .post(EP.NOTIFICATION_READ(id))
        .json<ApiResponse<NotificationWire>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.notifications() }),
  });
}
