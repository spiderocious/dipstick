import type { Request, Response } from 'express';

import { P, PERMISSION_DESCRIPTIONS } from '@dipstick/core';

import { getAuth } from '@lib/http/authedRequest.js';
import { sendResult } from '@lib/http/respond.js';
import { ResponseUtil } from '@lib/response.js';
import { validate } from '@lib/validate.js';
import { serializeMembership, serializeOrg, serializeUser } from '@shared/serializers.js';

import { authService } from './auth.service.js';
import {
  LoginBody,
  RefreshBody,
  RegisterBody,
  ResendOtpBody,
  UpdateOrgBody,
  VerifyOtpBody,
} from './auth.schema.js';

// Map the service's pending-channel list to the wire shape (dev_otp only in non-prod).
const serializePending = (
  pending: ReadonlyArray<{ channel: string; target: string; devOtp: string | null }>,
) =>
  pending.map((p) => ({
    channel: p.channel,
    target: p.target,
    ...(p.devOtp ? { dev_otp: p.devOtp } : {}),
  }));

export const authController = {
  register: async (req: Request, res: Response): Promise<Response> => {
    const body = validate(RegisterBody, req.body);
    const result = await authService.register({
      name: body.name,
      businessName: body.business_name,
      email: body.email,
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      password: body.password,
    });
    return sendResult(res, result, (r, data) =>
      ResponseUtil.created(r, {
        user: serializeUser(data.user),
        org: serializeOrg(data.org),
        // Empty pending + tokens → policy `none` (auto-verified, signed in immediately).
        verification_required: data.pending.length > 0,
        pending: serializePending(data.pending),
        tokens: data.tokens,
      }),
    );
  },

  verifyOtp: async (req: Request, res: Response): Promise<Response> => {
    const body = validate(VerifyOtpBody, req.body);
    const result = await authService.verifyOtp(body.channel, body.target, body.code);
    return sendResult(res, result, (r, data) =>
      ResponseUtil.ok(r, {
        user: serializeUser(data.user),
        tokens: data.tokens,
        // Non-empty → policy `both` and another channel still needs verifying.
        verification_required: data.pending.length > 0,
        pending: serializePending(data.pending),
      }),
    );
  },

  resendOtp: async (req: Request, res: Response): Promise<Response> => {
    const body = validate(ResendOtpBody, req.body);
    const result = await authService.resendOtp(body.channel, body.target);
    return sendResult(res, result, (r, data) =>
      ResponseUtil.ok(r, { sent: true, ...(data.devOtp ? { dev_otp: data.devOtp } : {}) }),
    );
  },

  login: async (req: Request, res: Response): Promise<Response> => {
    const body = validate(LoginBody, req.body);
    const result = await authService.login(body.email, body.password);
    return sendResult(res, result, (r, data) =>
      ResponseUtil.ok(r, {
        user: serializeUser(data.user),
        tokens: data.tokens,
        // tokens null + pending → account not yet verified; FE routes to OTP.
        verification_required: data.pending.length > 0,
        pending: serializePending(data.pending),
      }),
    );
  },

  refresh: async (req: Request, res: Response): Promise<Response> => {
    const body = validate(RefreshBody, req.body);
    const result = await authService.refresh(body.refresh_token);
    return sendResult(res, result);
  },

  logout: async (req: Request, res: Response): Promise<Response> => {
    const body = validate(RefreshBody, req.body);
    await authService.logout(body.refresh_token);
    return ResponseUtil.noContent(res);
  },

  me: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const result = await authService.me(auth.userId);
    return sendResult(res, result, (r, data) => {
      // Flatten effective permissions per branch for the FE to gate UI.
      const memberships = data.memberships.map((m) => ({
        ...serializeMembership(m.membership),
        role_name: m.role?.name ?? null,
        permissions: m.role?.permissions ?? [],
      }));
      return ResponseUtil.ok(r, { user: serializeUser(data.user), memberships });
    });
  },

  updateOrg: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(UpdateOrgBody, req.body);
    const result = await authService.updateOrg(auth.orgId, body, auth.userId);
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, serializeOrg(data)));
  },

  // The permission catalogue + descriptions — drives the role-builder UI.
  permissions: (_req: Request, res: Response): Promise<Response> =>
    Promise.resolve(
      ResponseUtil.ok(res, {
        permissions: Object.values(P).map((key) => ({
          key,
          description: PERMISSION_DESCRIPTIONS[key],
        })),
      }),
    ),
};
