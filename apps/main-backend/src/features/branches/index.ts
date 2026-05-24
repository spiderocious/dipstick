import { Router, type Express, type IRouter } from 'express';

import { P } from '@dipstick/core';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requirePermission } from '@middlewares/authorize.middleware.js';

import { branchesController } from './branches.controller.js';

// All branch sub-resources are nested under /branches/:branchId so requirePermission can
// resolve the caller's branch-scoped permissions from the :branchId param. Specific paths
// (/branches, with no param) are registered before the parameterized ones.
const router: IRouter = Router({ mergeParams: true });
router.use(requireAuth);

// Collection
router.get('/', requirePermission(P.CAN_VIEW_BRANCH), asyncHandler(branchesController.list));
router.post('/', requirePermission(P.CAN_CREATE_BRANCH), asyncHandler(branchesController.create));

// Single branch
router.get('/:branchId', requirePermission(P.CAN_VIEW_BRANCH), asyncHandler(branchesController.get));
router.patch(
  '/:branchId',
  requirePermission(P.CAN_EDIT_BRANCH),
  asyncHandler(branchesController.update),
);
router.post(
  '/:branchId/archive',
  requirePermission(P.CAN_ARCHIVE_BRANCH),
  asyncHandler(branchesController.archive),
);

// Tanks
router.post(
  '/:branchId/tanks',
  requirePermission(P.CAN_MANAGE_TANKS),
  asyncHandler(branchesController.addTank),
);
router.patch(
  '/:branchId/tanks/:tankId',
  requirePermission(P.CAN_MANAGE_TANKS),
  asyncHandler(branchesController.updateTank),
);

// Pumps
router.post(
  '/:branchId/pumps',
  requirePermission(P.CAN_MANAGE_PUMPS),
  asyncHandler(branchesController.addPump),
);
router.patch(
  '/:branchId/pumps/:pumpId',
  requirePermission(P.CAN_MANAGE_PUMPS),
  asyncHandler(branchesController.updatePump),
);

export const register = (app: Express): void => {
  app.use('/api/v1/branches', router);
};
