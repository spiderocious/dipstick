import { Router, type Express, type IRouter } from 'express';

import { P } from '@dipstick/core';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requirePermission, resolveScope } from '@middlewares/authorize.middleware.js';

import { shiftsController } from './shifts.controller.js';

// Branch-scoped surface: daybook, dips, open shift, post-balanced. These carry :branchId so
// permissions resolve per branch.
const branchRouter: IRouter = Router({ mergeParams: true });
branchRouter.use(requireAuth);
branchRouter.get(
  '/:branchId/daybook',
  requirePermission(P.CAN_VIEW_BRANCH),
  asyncHandler(shiftsController.daybook),
);
branchRouter.post(
  '/:branchId/dips',
  requirePermission(P.CAN_RECORD_DIP),
  asyncHandler(shiftsController.recordDip),
);
branchRouter.post(
  '/:branchId/shifts',
  requirePermission(P.CAN_OPEN_SHIFT),
  asyncHandler(shiftsController.openShift),
);
// Specific path before the parameterized shift routes below.
branchRouter.post(
  '/:branchId/shifts/post-balanced',
  requirePermission(P.CAN_POST_SHIFT),
  asyncHandler(shiftsController.postBalanced),
);

// Shift-id surface: get, close, post, void. Addressed by shiftId (no branch param) so we
// resolveScope from the caller's org-wide membership; the service re-checks orgId + does the
// own-pump permission check for close.
const shiftRouter: IRouter = Router();
shiftRouter.use(requireAuth);
shiftRouter.get('/:shiftId', resolveScope, asyncHandler(shiftsController.get));
shiftRouter.patch('/:shiftId', resolveScope, asyncHandler(shiftsController.close));
shiftRouter.post(
  '/:shiftId/post',
  requirePermission(P.CAN_POST_SHIFT),
  asyncHandler(shiftsController.post),
);
shiftRouter.post(
  '/:shiftId/void',
  requirePermission(P.CAN_VOID_SHIFT),
  asyncHandler(shiftsController.voidShift),
);

export const register = (app: Express): void => {
  app.use('/api/v1/branches', branchRouter);
  app.use('/api/v1/shifts', shiftRouter);
};
