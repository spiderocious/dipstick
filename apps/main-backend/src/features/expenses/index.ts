import { Router, type Express, type IRouter } from 'express';

import { P } from '@dipstick/core';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requirePermission } from '@middlewares/authorize.middleware.js';

import { expensesController } from './expenses.controller.js';

// Branch-scoped list + record live under /branches/:branchId so permissions resolve per
// branch.
const router: IRouter = Router({ mergeParams: true });
router.use(requireAuth);

router.get(
  '/:branchId/expenses',
  requirePermission(P.CAN_VIEW_EXPENSES),
  asyncHandler(expensesController.list),
);
router.post(
  '/:branchId/expenses',
  requirePermission(P.CAN_RECORD_EXPENSE),
  asyncHandler(expensesController.record),
);

// A single expense is addressed by expenseId; scope resolves via the org-wide membership of
// the caller (cross-org access fails NOT_FOUND in the service via orgId match). Mounted
// separately at /expenses/:expenseId.
const expenseRouter: IRouter = Router();
expenseRouter.use(requireAuth);
expenseRouter.get(
  '/:expenseId',
  requirePermission(P.CAN_VIEW_EXPENSES),
  asyncHandler(expensesController.getOne),
);

export const register = (app: Express): void => {
  app.use('/api/v1/branches', router);
  app.use('/api/v1/expenses', expenseRouter);
};
