import type { Request, Response } from 'express';

import type { Permission, Product, ShiftWindow } from '@dipstick/core';

import { getAuth } from '@lib/http/authedRequest.js';
import { sendResult } from '@lib/http/respond.js';
import { ResponseUtil } from '@lib/response.js';
import { validate } from '@lib/validate.js';
import { serializeDip, serializeRefs, serializeShift, serializeTank } from '@shared/serializers.js';

import { refsService } from '../refs/refs.service.js';
import {
  CloseShiftBody,
  OpenShiftBody,
  PostBalancedBody,
  RecordDipBody,
  VoidShiftBody,
} from './shifts.schema.js';
import { shiftsService, type Caller } from './shifts.service.js';

const callerOf = (req: Request): Caller => {
  const auth = getAuth(req);
  return {
    userId: auth.userId,
    permissions: (auth.permissions ?? new Set<Permission>()) as Set<string>,
    defaultPumpId: auth.defaultPumpId ?? null,
  };
};

export const shiftsController = {
  openShift: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(OpenShiftBody, req.body);
    const result = await shiftsService.open(
      auth.orgId,
      req.params['branchId'] as string,
      {
        pumpId: body.pump_id,
        attendantId: body.attendant_id,
        window: body.window as ShiftWindow,
        businessDate: body.business_date,
        openingMeter: body.opening_meter,
        ...(body.price_per_litre_kobo !== undefined
          ? { pricePerLitreKobo: body.price_per_litre_kobo }
          : {}),
        ...(body.price_override_reason !== undefined
          ? { priceOverrideReason: body.price_override_reason }
          : {}),
        ...(body.product !== undefined ? { product: body.product as Product } : {}),
      },
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.created(r, serializeShift(data)));
  },

  get: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const result = await shiftsService.getById(auth.orgId, req.params['shiftId'] as string);
    if (!result.success) return sendResult(res, result);
    const s = result.data;
    const refs = await refsService.resolveRefs(auth.orgId, [s.attendantId, s.pumpId, s.branchId]);
    return ResponseUtil.okWithRefs(res, serializeShift(s), serializeRefs(refs));
  },

  close: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(CloseShiftBody, req.body);
    const result = await shiftsService.close(
      auth.orgId,
      req.params['shiftId'] as string,
      { closingMeter: body.closing_meter, cashDeclaredKobo: body.cash_declared_kobo },
      callerOf(req),
    );
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, serializeShift(data)));
  },

  post: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const result = await shiftsService.post(auth.orgId, req.params['shiftId'] as string, auth.userId);
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, serializeShift(data)));
  },

  voidShift: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(VoidShiftBody, req.body);
    const result = await shiftsService.voidShift(
      auth.orgId,
      req.params['shiftId'] as string,
      { reason: body.reason, confirm: body.confirm },
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, serializeShift(data)));
  },

  postBalanced: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(PostBalancedBody, req.body);
    const result = await shiftsService.postBalanced(
      auth.orgId,
      req.params['branchId'] as string,
      body.business_date,
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, data));
  },

  recordDip: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(RecordDipBody, req.body);
    const result = await shiftsService.recordDip(
      auth.orgId,
      req.params['branchId'] as string,
      {
        tankId: body.tank_id,
        kind: body.kind,
        litres: body.litres,
        businessDate: body.business_date,
      },
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.created(r, serializeDip(data)));
  },

  daybook: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const date = (req.query['date'] as string | undefined) ?? new Date().toISOString().slice(0, 10);
    const result = await shiftsService.daybook(auth.orgId, req.params['branchId'] as string, date);
    if (!result.success) return sendResult(res, result);
    const data = result.data;
    // Resolve attendant + pump ids shown on each shift row so the FE can name + link them.
    const ids = new Set<string>();
    for (const s of data.shifts) {
      ids.add(s.attendantId);
      ids.add(s.pumpId);
    }
    const refs = await refsService.resolveRefs(auth.orgId, [...ids]);
    return ResponseUtil.okWithRefs(
      res,
      {
        business_date: date,
        shifts: data.shifts.map(serializeShift),
        dips: data.dips.map(serializeDip),
        tanks: data.tanks.map(serializeTank),
      },
      serializeRefs(refs),
    );
  },
};
