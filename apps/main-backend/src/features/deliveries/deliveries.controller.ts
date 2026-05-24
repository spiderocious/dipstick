import type { Request, Response } from 'express';

import type { DeliveryStage, Product } from '@dipstick/core';

import { getAuth } from '@lib/http/authedRequest.js';
import { sendResult } from '@lib/http/respond.js';
import { parsePageParams, pageMeta } from '@lib/pagination.js';
import { ResponseUtil } from '@lib/response.js';
import { validate } from '@lib/validate.js';
import { serializeDelivery } from '@shared/serializers.js';

import {
  CreateDeliveryBody,
  SignDeliveryBody,
  UpdateDeliveryBody,
} from './deliveries.schema.js';
import { deliveriesService } from './deliveries.service.js';

export const deliveriesController = {
  list: async (req: Request, res: Response): Promise<Response> => {
    const { cursor, limit } = parsePageParams(req.query as Record<string, unknown>);
    const page = await deliveriesService.list({
      branchId: req.params['branchId'] as string,
      cursor,
      limit,
    });
    return ResponseUtil.ok(res, { items: page.items.map(serializeDelivery) }, pageMeta(page));
  },

  create: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(CreateDeliveryBody, req.body);
    const result = await deliveriesService.create(
      auth.orgId,
      req.params['branchId'] as string,
      {
        tankId: body.tank_id,
        product: body.product as Product,
        waybillNumber: body.waybill_number,
        supplier: body.supplier,
        driverName: body.driver_name,
        truckPlate: body.truck_plate,
        ...(body.witness !== undefined ? { witness: body.witness } : {}),
        waybillLitres: body.waybill_litres,
        costPerLitreKobo: body.cost_per_litre_kobo,
      },
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.created(r, serializeDelivery(data)));
  },

  get: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const result = await deliveriesService.getById(auth.orgId, req.params['deliveryId'] as string);
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, serializeDelivery(data)));
  },

  update: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(UpdateDeliveryBody, req.body);
    const patch: {
      stage?: DeliveryStage;
      dipBeforeLitres?: number;
      dipAfterLitres?: number;
      witness?: string | null;
    } = {};
    if (body.stage !== undefined) patch.stage = body.stage;
    if (body.dip_before_litres !== undefined) patch.dipBeforeLitres = body.dip_before_litres;
    if (body.dip_after_litres !== undefined) patch.dipAfterLitres = body.dip_after_litres;
    if (body.witness !== undefined) patch.witness = body.witness;
    const result = await deliveriesService.update(
      auth.orgId,
      req.params['deliveryId'] as string,
      patch,
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, serializeDelivery(data)));
  },

  sign: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(SignDeliveryBody, req.body);
    const result = await deliveriesService.sign(
      auth.orgId,
      req.params['deliveryId'] as string,
      body.witness,
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, serializeDelivery(data)));
  },
};
