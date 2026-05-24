import type { Request, Response } from 'express';

import type { ShiftWindow } from '@dipstick/core';

import { getAuth } from '@lib/http/authedRequest.js';
import { sendResult } from '@lib/http/respond.js';
import { ResponseUtil } from '@lib/response.js';
import { validate } from '@lib/validate.js';
import { serializeMembership, serializeUser } from '@shared/serializers.js';

import { AddStaffBody, SetRosterBody, UpdateStaffBody } from './staff.schema.js';
import { staffService } from './staff.service.js';

export const staffController = {
  directory: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const rows = await staffService.directory(auth.orgId, req.params['branchId'] as string);
    return ResponseUtil.ok(res, {
      items: rows.map((r) => ({
        ...serializeMembership(r.membership),
        user: r.user ? serializeUser(r.user) : null,
        role_name: r.roleName,
        shift_count_30d: r.shiftCount30d,
        variance_kobo_30d: r.varianceKobo30d,
      })),
    });
  },

  add: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(AddStaffBody, req.body);
    const result = await staffService.add(
      auth.orgId,
      req.params['branchId'] as string,
      {
        name: body.name,
        email: body.email,
        phone: body.phone,
        roleId: body.role_id,
        ...(body.default_pump_id !== undefined ? { defaultPumpId: body.default_pump_id } : {}),
        ...(body.password !== undefined ? { password: body.password } : {}),
      },
      auth.userId,
    );
    return sendResult(res, result, (r, data) =>
      ResponseUtil.created(r, {
        ...serializeMembership(data.membership),
        user: serializeUser(data.user),
      }),
    );
  },

  update: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(UpdateStaffBody, req.body);
    const patch: { roleId?: string; defaultPumpId?: string | null; isActive?: boolean } = {};
    if (body.role_id !== undefined) patch.roleId = body.role_id;
    if (body.default_pump_id !== undefined) patch.defaultPumpId = body.default_pump_id;
    if (body.is_active !== undefined) patch.isActive = body.is_active;
    const result = await staffService.update(
      auth.orgId,
      req.params['membershipId'] as string,
      patch,
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, serializeMembership(data)));
  },

  getRoster: async (req: Request, res: Response): Promise<Response> => {
    const weekStart = (req.query['week_start'] as string | undefined) ?? '';
    const roster = await staffService.getRoster(req.params['branchId'] as string, weekStart);
    return ResponseUtil.ok(res, {
      week_start: weekStart,
      assignments: roster?.assignments ?? {},
    });
  },

  setRoster: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(SetRosterBody, req.body);
    const result = await staffService.setRoster(
      auth.orgId,
      req.params['branchId'] as string,
      body.week_start,
      body.assignments as Record<string, ShiftWindow[]>,
      auth.userId,
    );
    return sendResult(res, result, (r, data) =>
      ResponseUtil.ok(r, { week_start: data.weekStart, assignments: data.assignments }),
    );
  },

  leaderboard: async (req: Request, res: Response): Promise<Response> => {
    const rows = await staffService.leaderboard(req.params['branchId'] as string);
    return ResponseUtil.ok(res, {
      items: rows.map((r) => ({
        attendant_id: r.attendantId,
        variance_kobo: r.varianceKobo,
        shift_count: r.shiftCount,
      })),
    });
  },
};
