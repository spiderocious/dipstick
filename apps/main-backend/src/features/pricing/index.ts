import { Router, type Express, type IRouter } from 'express';

import { P } from '@dipstick/core';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requirePermission } from '@middlewares/authorize.middleware.js';

import { pricingController } from './pricing.controller.js';

const router: IRouter = Router({ mergeParams: true });
router.use(requireAuth);

router.get(
  '/:branchId/prices',
  requirePermission(P.CAN_VIEW_BRANCH),
  asyncHandler(pricingController.current),
);
router.post(
  '/:branchId/prices/preview',
  requirePermission(P.CAN_SET_PRICE),
  asyncHandler(pricingController.preview),
);
router.post(
  '/:branchId/prices',
  requirePermission(P.CAN_SET_PRICE),
  asyncHandler(pricingController.set),
);
router.get(
  '/:branchId/prices/:product/history',
  requirePermission(P.CAN_VIEW_PRICE_HISTORY),
  asyncHandler(pricingController.history),
);

export const register = (app: Express): void => {
  app.use('/api/v1/branches', router);
};
