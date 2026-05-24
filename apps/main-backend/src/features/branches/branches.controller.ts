import type { Request, Response } from 'express';

import type { Product, PumpState } from '@dipstick/core';

import { getAuth } from '@lib/http/authedRequest.js';
import { sendResult } from '@lib/http/respond.js';
import { ResponseUtil } from '@lib/response.js';
import { validate } from '@lib/validate.js';
import { serializeBranch, serializePump, serializeTank } from '@shared/serializers.js';

import {
  CreateBranchBody,
  CreatePumpBody,
  CreateTankBody,
  UpdateBranchBody,
  UpdatePumpBody,
  UpdateTankBody,
} from './branches.schema.js';
import { branchesService } from './branches.service.js';

export const branchesController = {
  list: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const branches = await branchesService.listForUser(auth.orgId, auth.userId);
    return ResponseUtil.ok(res, { items: branches.map(serializeBranch) });
  },

  get: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const result = await branchesService.getDetail(auth.orgId, req.params['branchId'] as string);
    return sendResult(res, result, (r, data) =>
      ResponseUtil.ok(r, {
        ...serializeBranch(data.branch),
        tanks: data.tanks.map(serializeTank),
        pumps: data.pumps.map(serializePump),
      }),
    );
  },

  create: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(CreateBranchBody, req.body);
    const result = await branchesService.create(
      auth.orgId,
      {
        name: body.name,
        city: body.city,
        state: body.state,
        ...(body.tanks
          ? {
              tanks: body.tanks.map((t) => ({
                product: t.product as Product,
                capacityLitres: t.capacity_litres,
                reorderThresholdLitres: t.reorder_threshold_litres,
              })),
            }
          : {}),
        ...(body.pumps
          ? { pumps: body.pumps.map((p) => ({ product: p.product as Product, label: p.label })) }
          : {}),
      },
      auth.userId,
    );
    return sendResult(res, result, (r, data) =>
      ResponseUtil.created(r, {
        ...serializeBranch(data.branch),
        tanks: data.tanks.map(serializeTank),
        pumps: data.pumps.map(serializePump),
      }),
    );
  },

  update: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(UpdateBranchBody, req.body);
    const patch: Parameters<typeof branchesService.update>[2] = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.city !== undefined) patch.city = body.city;
    if (body.state !== undefined) patch.state = body.state;
    if (body.settings) {
      const s: NonNullable<typeof patch.settings> = {};
      if (body.settings.require_closing_dip !== undefined)
        s.requireClosingDip = body.settings.require_closing_dip;
      if (body.settings.variance_flag_kobo !== undefined)
        s.varianceFlagKobo = body.settings.variance_flag_kobo;
      if (body.settings.manager_may_set_price !== undefined)
        s.managerMaySetPrice = body.settings.manager_may_set_price;
      if (body.settings.delivery_tolerance_litres !== undefined)
        s.deliveryToleranceLitres = body.settings.delivery_tolerance_litres;
      patch.settings = s;
    }
    const result = await branchesService.update(
      auth.orgId,
      req.params['branchId'] as string,
      patch,
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, serializeBranch(data)));
  },

  archive: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const result = await branchesService.archive(
      auth.orgId,
      req.params['branchId'] as string,
      auth.userId,
    );
    return sendResult(res, result, (r) => ResponseUtil.noContent(r));
  },

  addTank: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(CreateTankBody, req.body);
    const result = await branchesService.addTank(
      auth.orgId,
      req.params['branchId'] as string,
      {
        product: body.product as Product,
        capacityLitres: body.capacity_litres,
        reorderThresholdLitres: body.reorder_threshold_litres,
      },
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.created(r, serializeTank(data)));
  },

  updateTank: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(UpdateTankBody, req.body);
    const patch: { capacityLitres?: number; reorderThresholdLitres?: number } = {};
    if (body.capacity_litres !== undefined) patch.capacityLitres = body.capacity_litres;
    if (body.reorder_threshold_litres !== undefined)
      patch.reorderThresholdLitres = body.reorder_threshold_litres;
    const result = await branchesService.updateTank(
      auth.orgId,
      req.params['tankId'] as string,
      patch,
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, serializeTank(data)));
  },

  addPump: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(CreatePumpBody, req.body);
    const result = await branchesService.addPump(
      auth.orgId,
      req.params['branchId'] as string,
      { product: body.product as Product, label: body.label },
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.created(r, serializePump(data)));
  },

  updatePump: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(UpdatePumpBody, req.body);
    const patch: { label?: string; state?: PumpState; faultNote?: string | null } = {};
    if (body.label !== undefined) patch.label = body.label;
    if (body.state !== undefined) patch.state = body.state;
    if (body.fault_note !== undefined) patch.faultNote = body.fault_note;
    const result = await branchesService.updatePump(
      auth.orgId,
      req.params['pumpId'] as string,
      patch,
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, serializePump(data)));
  },
};
