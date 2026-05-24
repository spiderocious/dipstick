import { Router, type Express, type IRouter } from 'express';

import { P } from '@dipstick/core';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requirePermission } from '@middlewares/authorize.middleware.js';

import { auditController } from './audit.controller.js';

// Branch-scoped audit timeline.
const branchRouter: IRouter = Router({ mergeParams: true });
branchRouter.use(requireAuth);
branchRouter.get(
  '/:branchId/audit',
  requirePermission(P.CAN_VIEW_AUDIT),
  asyncHandler(auditController.list),
);

export const register = (app: Express): void => {
  app.use('/api/v1/branches', branchRouter);
};
