import type { Request, Response } from 'express';

import type { Product } from '@dipstick/core';

import { getAuth } from '@lib/http/authedRequest.js';
import { sendResult } from '@lib/http/respond.js';
import { ResponseUtil } from '@lib/response.js';
import { validate } from '@lib/validate.js';
import { serializePrice } from '@shared/serializers.js';

import { PreviewPriceBody, SetPriceBody } from './pricing.schema.js';
import { pricingService } from './pricing.service.js';

export const pricingController = {
  current: async (req: Request, res: Response): Promise<Response> => {
    const map = await pricingService.currentAll(req.params['branchId'] as string);
    const items = (Object.entries(map) as [Product, Awaited<ReturnType<typeof pricingService.currentAll>>[Product]][]).map(
      ([product, price]) => ({ product, price: price ? serializePrice(price) : null }),
    );
    return ResponseUtil.ok(res, { items });
  },

  history: async (req: Request, res: Response): Promise<Response> => {
    const history = await pricingService.history(
      req.params['branchId'] as string,
      req.params['product'] as Product,
    );
    return ResponseUtil.ok(res, { items: history.map(serializePrice) });
  },

  set: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(SetPriceBody, req.body);
    const result = await pricingService.set(
      auth.orgId,
      req.params['branchId'] as string,
      {
        product: body.product as Product,
        pricePerLitreKobo: body.price_per_litre_kobo,
        effectiveAt: body.effective_at,
        reason: body.reason,
      },
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.created(r, serializePrice(data)));
  },

  preview: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(PreviewPriceBody, req.body);
    const result = await pricingService.preview(
      auth.orgId,
      req.params['branchId'] as string,
      body.product as Product,
      body.price_per_litre_kobo,
    );
    return sendResult(res, result, (r, data) =>
      ResponseUtil.ok(r, {
        delta_per_litre_kobo: data.deltaPerLitreKobo,
        litres_in_tank: data.litresInTank,
        revaluation_kobo: data.revaluationKobo,
        current_price_kobo: data.currentPriceKobo,
      }),
    );
  },
};
