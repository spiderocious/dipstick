import { Router, type Express, type IRouter } from 'express';

import { P } from '@dipstick/core';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import {
  requirePermission,
  requirePermissionForBranch,
  type BranchResolver,
} from '@middlewares/authorize.middleware.js';

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
// Assign an existing person to THIS branch (multi-branch). :branchId drives scope.
router.post(
  '/:branchId/staff/:userId/assign',
  requirePermission(P.CAN_MANAGE_STAFF, P.CAN_ASSIGN_ROLES),
  asyncHandler(staffController.assign),
);

// Resolve scope to a branch the TARGET user belongs to (any active branch membership; owner
// '*' resolves org-wide). Lets a branch-scoped manager act on staff they share a branch with.
const userBranchResolver: BranchResolver = async (req) => {
  const userId = req.params['userId'] as string;
  const memberships = await membershipRepo.findByUser(userId);
  const branchScoped = memberships.find((m) => m.branchId !== '*');
  // '*' target → org-wide (null) so an owner caller resolves their own '*' membership.
  return branchScoped ? branchScoped.branchId : null;
};

// Membership update by membershipId (existing contract). Scope = the target membership's branch.
const memberRouter: IRouter = Router();
memberRouter.use(requireAuth);

// Per-person detail surface, addressed by userId. Specific paths before the bare /:userId.
memberRouter.get(
  '/:userId/detail',
  requirePermissionForBranch(userBranchResolver, P.CAN_VIEW_STAFF),
  asyncHandler(staffController.detail),
);
memberRouter.get(
  '/:userId/activity',
  requirePermissionForBranch(userBranchResolver, P.CAN_VIEW_STAFF, P.CAN_VIEW_AUDIT),
  asyncHandler(staffController.activity),
);
memberRouter.post(
  '/:userId/reset-password',
  requirePermissionForBranch(userBranchResolver, P.CAN_MANAGE_STAFF),
  asyncHandler(staffController.resetPassword),
);
memberRouter.patch(
  '/:userId/account',
  requirePermissionForBranch(userBranchResolver, P.CAN_MANAGE_STAFF),
  asyncHandler(staffController.editAccount),
);

// Membership update is addressed by membershipId. Scope resolves against the TARGET
// membership's branch (BUG-02). Registered last so the more specific /:userId/* paths above
// win; this matches the single-segment /:membershipId only.
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
