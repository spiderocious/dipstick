import type { Request, Response } from 'express';

import type { ShiftWindow } from '@dipstick/core';

import { getAuth } from '@lib/http/authedRequest.js';
import { sendResult } from '@lib/http/respond.js';
import { parsePageParams, pageMeta } from '@lib/pagination.js';
import { ResponseUtil } from '@lib/response.js';
import { validate } from '@lib/validate.js';
import { serializeMembership, serializeRefs, serializeShift, serializeUser } from '@shared/serializers.js';

import { auditRepo } from '../audit/audit.repo.js';
import { refsService } from '../refs/refs.service.js';
import {
  AddStaffBody,
  AssignBranchBody,
  EditAccountBody,
  SetRosterBody,
  UpdateStaffBody,
} from './staff.schema.js';
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

  // GET /staff/:userId — the per-person detail (account, all memberships, metrics, shifts).
  detail: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const result = await staffService.getDetail(auth.orgId, req.params['userId'] as string);
    return sendResult(res, result, (r, data) =>
      ResponseUtil.ok(r, {
        user: serializeUser(data.user),
        memberships: data.memberships.map((m) => ({
          ...serializeMembership(m.membership),
          branch_name: m.branchName,
          role_name: m.roleName,
          permissions: m.permissions,
        })),
        metrics: {
          shift_count_total: data.metrics.shiftCountTotal,
          shift_count_30d: data.metrics.shiftCount30d,
          variance_kobo_30d: data.metrics.varianceKobo30d,
        },
        recent_shifts: data.recentShifts.map(serializeShift),
      }),
    );
  },

  // GET /staff/:userId/activity — audit entries this person performed (refs-enriched).
  activity: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const { cursor, limit } = parsePageParams(req.query as Record<string, unknown>);
    const page = await auditRepo.list({
      orgId: auth.orgId,
      actorId: req.params['userId'] as string,
      cursor,
      limit,
    });
    const ids = new Set<string>();
    for (const d of page.items) {
      if (d.actorId) ids.add(d.actorId);
      if (d.entityId) ids.add(d.entityId);
      if (d.branchId) ids.add(d.branchId);
      refsService.collectIdsFromValue(d.before, ids);
      refsService.collectIdsFromValue(d.after, ids);
    }
    const refs = await refsService.resolveRefs(auth.orgId, [...ids]);
    return ResponseUtil.okWithRefs(
      res,
      {
        items: page.items.map((d) => ({
          id: d._id,
          branch_id: d.branchId,
          actor_id: d.actorId,
          action: d.action,
          entity_type: d.entityType,
          entity_id: d.entityId,
          before: d.before,
          after: d.after,
          note: d.note,
          at: d.at,
        })),
      },
      serializeRefs(refs),
      pageMeta(page),
    );
  },

  // POST /branches/:branchId/staff/:userId/assign — add a membership in another branch.
  assign: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(AssignBranchBody, req.body);
    const result = await staffService.assignToBranch(
      auth.orgId,
      req.params['branchId'] as string,
      req.params['userId'] as string,
      body.role_id,
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.created(r, serializeMembership(data)));
  },

  // POST /staff/:userId/reset-password — issue a fresh temp password.
  resetPassword: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const result = await staffService.resetPassword(
      auth.orgId,
      req.params['userId'] as string,
      auth.userId,
    );
    return sendResult(res, result, (r, data) =>
      ResponseUtil.ok(r, { reset: true, ...(data.tempPassword ? { temp_password: data.tempPassword } : {}) }),
    );
  },

  // PATCH /staff/:userId — edit the account (name/email/phone).
  editAccount: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(EditAccountBody, req.body);
    const patch: { name?: string; email?: string; phone?: string | null } = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.email !== undefined) patch.email = body.email;
    if (body.phone !== undefined) patch.phone = body.phone;
    const result = await staffService.editAccount(
      auth.orgId,
      req.params['userId'] as string,
      patch,
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, serializeUser(data)));
  },
};
