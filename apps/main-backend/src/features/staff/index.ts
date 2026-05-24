import { Router, type Express, type IRouter } from 'express';

import { P } from '@dipstick/core';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requirePermission } from '@middlewares/authorize.middleware.js';

import { staffController } from './staff.controller.js';

// Staff + roster live under /branches/:branchId so permissions resolve per branch.
const router: IRouter = Router({ mergeParams: true });
router.use(requireAuth);

router.get(
  '/:branchId/staff',
  requirePermission(P.CAN_VIEW_STAFF),
  asyncHandler(staffController.directory),
);
router.post(
  '/:branchId/staff',
  requirePermission(P.CAN_MANAGE_STAFF),
  asyncHandler(staffController.add),
);
router.get(
  '/:branchId/roster',
  requirePermission(P.CAN_VIEW_STAFF),
  asyncHandler(staffController.getRoster),
);
router.put(
  '/:branchId/roster',
  requirePermission(P.CAN_MANAGE_ROSTER),
  asyncHandler(staffController.setRoster),
);
router.get(
  '/:branchId/variance-leaderboard',
  requirePermission(P.CAN_VIEW_STAFF),
  asyncHandler(staffController.leaderboard),
);

// Membership update is addressed by membershipId; scope resolves via the org-wide
// membership of the caller (managers update staff in their branch — enforced in service by
// orgId match). Mounted separately at /staff/:membershipId.
const memberRouter: IRouter = Router();
memberRouter.use(requireAuth);
memberRouter.patch(
  '/:membershipId',
  requirePermission(P.CAN_MANAGE_STAFF, P.CAN_ASSIGN_ROLES),
  asyncHandler(staffController.update),
);

export const register = (app: Express): void => {
  app.use('/api/v1/branches', router);
  app.use('/api/v1/staff', memberRouter);
};
