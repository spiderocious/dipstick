import { Router, type Express, type IRouter } from 'express';

import { P } from '@dipstick/core';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requirePermission, resolveScope } from '@middlewares/authorize.middleware.js';

import { deliveriesController } from './deliveries.controller.js';

// Branch-scoped: list + create under /branches/:branchId/deliveries.
const branchRouter: IRouter = Router({ mergeParams: true });
branchRouter.use(requireAuth);
branchRouter.get(
  '/:branchId/deliveries',
  requirePermission(P.CAN_VIEW_BRANCH),
  asyncHandler(deliveriesController.list),
);
branchRouter.post(
  '/:branchId/deliveries',
  requirePermission(P.CAN_RECORD_DELIVERY),
  asyncHandler(deliveriesController.create),
);

// Delivery-id surface: get, step the offload, sign. Scope resolves from org-wide membership;
// the service re-checks orgId.
const deliveryRouter: IRouter = Router();
deliveryRouter.use(requireAuth);
deliveryRouter.get('/:deliveryId', resolveScope, asyncHandler(deliveriesController.get));
deliveryRouter.patch(
  '/:deliveryId',
  requirePermission(P.CAN_RECORD_DELIVERY),
  asyncHandler(deliveriesController.update),
);
deliveryRouter.post(
  '/:deliveryId/sign',
  requirePermission(P.CAN_SIGN_DELIVERY),
  asyncHandler(deliveriesController.sign),
);

export const register = (app: Express): void => {
  app.use('/api/v1/branches', branchRouter);
  app.use('/api/v1/deliveries', deliveryRouter);
};
