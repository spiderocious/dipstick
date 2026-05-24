import { Router, type Express, type IRouter } from 'express';

import { P } from '@dipstick/core';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requirePermission } from '@middlewares/authorize.middleware.js';

import { rollupController } from './rollup.controller.js';

// The roll-up is org-scoped (cross-branch). requirePermission resolves the caller's org-wide
// membership and checks CAN_VIEW_ROLLUP.
const router: IRouter = Router();
router.use(requireAuth);
router.get('/', requirePermission(P.CAN_VIEW_ROLLUP), asyncHandler(rollupController.morning));
router.get('/trends', requirePermission(P.CAN_VIEW_ROLLUP), asyncHandler(rollupController.trends));

export const register = (app: Express): void => {
  app.use('/api/v1/rollup', router);
};
