import { Router, type Express, type IRouter } from 'express';

import { P } from '@dipstick/core';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requirePermission, requirePermissionForBranch } from '@middlewares/authorize.middleware.js';

import { membershipRepo } from '../auth/auth.repo.mongo.js';
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

// Membership update is addressed by membershipId (no :branchId in the path). Scope must
// resolve against the TARGET staff member's branch — not the caller's '*' membership — so a
// branch-scoped Manager can edit staff in their own branch (BUG-02). We look up the target
// membership's branchId and authorize against that; a '*' (org-wide) target falls back to
// org-wide scope. A null branchId (membership not found / cross-tenant) → loadScope yields
// the caller's '*' membership, and the service still re-checks orgId → 404 for the stranger.
const memberRouter: IRouter = Router();
memberRouter.use(requireAuth);
memberRouter.patch(
  '/:membershipId',
  requirePermissionForBranch(
    async (req) => {
      const target = await membershipRepo.findById(req.params['membershipId'] as string);
      if (!target) return null;
      return target.branchId === '*' ? null : target.branchId;
    },
    P.CAN_MANAGE_STAFF,
    P.CAN_ASSIGN_ROLES,
  ),
  asyncHandler(staffController.update),
);

export const register = (app: Express): void => {
  app.use('/api/v1/branches', router);
  app.use('/api/v1/staff', memberRouter);
};
