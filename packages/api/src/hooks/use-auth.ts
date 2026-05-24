import { TOKEN_KEYS, QK, createTokenStorage } from '@dipstick/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client.js';
import { EP } from '../endpoints.js';
import type { ApiResponse } from '../types/envelope.js';
import type {
  LoginPayload,
  RegisterPayload,
  ResendOtpPayload,
  UpdateOrgPayload,
  VerifyOtpPayload,
} from '../types/payloads.js';
import type {
  AuthSessionWire,
  MeWire,
  OrgWire,
  RegisterResultWire,
  TokensWire,
} from '../types/wire.js';

const storage = createTokenStorage();

function persistTokens(tokens: TokensWire): void {
  storage.set(TOKEN_KEYS.ACCESS, tokens.access_token);
  storage.set(TOKEN_KEYS.REFRESH, tokens.refresh_token);
}

export function clearTokens(): void {
  storage.remove(TOKEN_KEYS.ACCESS);
  storage.remove(TOKEN_KEYS.REFRESH);
}

export function hasSession(): boolean {
  return storage.get(TOKEN_KEYS.ACCESS) !== null;
}

/** Current user + memberships. Enabled only when a token exists. */
export function useMe(enabled = true) {
  return useQuery({
    queryKey: QK.me(),
    enabled: enabled && hasSession(),
    queryFn: async () => {
      const res = await apiClient.get(EP.AUTH_ME).json<ApiResponse<MeWire>>();
      return res.data;
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const res = await apiClient
        .post(EP.AUTH_REGISTER, { json: payload })
        .json<ApiResponse<RegisterResultWire>>();
      return res.data;
    },
  });
}

export function useVerifyOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VerifyOtpPayload) => {
      const res = await apiClient
        .post(EP.AUTH_VERIFY_OTP, { json: payload })
        .json<ApiResponse<AuthSessionWire>>();
      return res.data;
    },
    onSuccess: (data) => {
      // tokens may be null when another channel still needs verifying (policy `both`).
      if (data.tokens) {
        persistTokens(data.tokens);
        void qc.invalidateQueries({ queryKey: QK.me() });
      }
    },
  });
}

export function useResendOtp() {
  return useMutation({
    mutationFn: async (payload: ResendOtpPayload) => {
      const res = await apiClient
        .post(EP.AUTH_RESEND_OTP, { json: payload })
        .json<ApiResponse<{ sent: boolean; dev_otp?: string }>>();
      return res.data;
    },
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const res = await apiClient
        .post(EP.AUTH_LOGIN, { json: payload })
        .json<ApiResponse<AuthSessionWire>>();
      return res.data;
    },
    onSuccess: (data) => {
      // tokens null → account unverified; the screen routes to OTP instead of signing in.
      if (data.tokens) {
        persistTokens(data.tokens);
        void qc.invalidateQueries({ queryKey: QK.me() });
      }
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const refresh = storage.get(TOKEN_KEYS.REFRESH);
      if (refresh !== null) {
        await apiClient.post(EP.AUTH_LOGOUT, { json: { refresh_token: refresh } });
      }
    },
    onSettled: () => {
      clearTokens();
      qc.clear();
    },
  });
}

export function useUpdateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateOrgPayload) => {
      const res = await apiClient.patch(EP.ORG, { json: payload }).json<ApiResponse<OrgWire>>();
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.me() });
    },
  });
}
