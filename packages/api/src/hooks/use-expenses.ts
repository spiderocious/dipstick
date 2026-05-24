import { QK } from '@dipstick/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client.js';
import { EP } from '../endpoints.js';
import type { ApiResponse } from '../types/envelope.js';
import type { RecordExpensePayload } from '../types/payloads.js';
import type { ExpenseWire, PageMeta } from '../types/wire.js';

const ALL_CATEGORIES = '' as const;

export function useExpenses(branchId: string, category: string = ALL_CATEGORIES) {
  return useQuery({
    queryKey: QK.expenses(branchId, category),
    enabled: branchId !== '',
    queryFn: async () => {
      const searchParams = category !== ALL_CATEGORIES ? { category } : undefined;
      const res = await apiClient
        .get(EP.EXPENSES(branchId), searchParams !== undefined ? { searchParams } : {})
        .json<ApiResponse<{ items: ExpenseWire[] }> & { meta?: PageMeta }>();
      return res.data.items;
    },
  });
}

export function useExpense(expenseId: string) {
  return useQuery({
    queryKey: QK.expense(expenseId),
    enabled: expenseId !== '',
    queryFn: async () => {
      const res = await apiClient.get(EP.EXPENSE(expenseId)).json<ApiResponse<ExpenseWire>>();
      return res.data;
    },
  });
}

export function useRecordExpense(branchId: string, category: string = ALL_CATEGORIES) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RecordExpensePayload) => {
      const res = await apiClient
        .post(EP.EXPENSES(branchId), { json: payload })
        .json<ApiResponse<ExpenseWire>>();
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.expenses(branchId, category) }),
  });
}
