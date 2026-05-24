import type { Request, Response } from 'express';

import type { Permission } from '@dipstick/core';

import { getAuth } from '@lib/http/authedRequest.js';
import { sendResult } from '@lib/http/respond.js';
import { ResponseUtil } from '@lib/response.js';
import { validate } from '@lib/validate.js';
import { serializeRole } from '@shared/serializers.js';

import { CreateRoleBody, UpdateRoleBody } from './roles.schema.js';
import { rolesService } from './roles.service.js';

export const rolesController = {
  list: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const roles = await rolesService.list(auth.orgId);
    return ResponseUtil.ok(res, { items: roles.map(serializeRole) });
  },

  create: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(CreateRoleBody, req.body);
    const result = await rolesService.create(
      auth.orgId,
      { name: body.name, permissions: body.permissions as Permission[] },
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.created(r, serializeRole(data)));
  },

  update: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(UpdateRoleBody, req.body);
    const patch: { name?: string; permissions?: Permission[] } = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.permissions !== undefined) patch.permissions = body.permissions as Permission[];
    const result = await rolesService.update(
      auth.orgId,
      req.params['roleId'] as string,
      patch,
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, serializeRole(data)));
  },

  remove: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const result = await rolesService.remove(
      auth.orgId,
      req.params['roleId'] as string,
      auth.userId,
    );
    return sendResult(res, result, (r) => ResponseUtil.noContent(r));
  },
};
