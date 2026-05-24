import { Router, type Express, type IRouter } from 'express';

import { P } from '@dipstick/core';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requirePermission } from '@middlewares/authorize.middleware.js';

import { notesController } from './notes.controller.js';

// Notes are entity-scoped: the path is /:entityType/:entityId/notes, so the router mounts at
// the API root. There is no :branchId param to resolve scope from — listing is gated by
// CAN_VIEW_BRANCH (org-wide membership) and adding by CAN_ADD_NOTE.
const router: IRouter = Router({ mergeParams: true });
router.use(requireAuth);

router.get(
  '/:entityType/:entityId/notes',
  requirePermission(P.CAN_VIEW_BRANCH),
  asyncHandler(notesController.list),
);
router.post(
  '/:entityType/:entityId/notes',
  requirePermission(P.CAN_ADD_NOTE),
  asyncHandler(notesController.add),
);

export const register = (app: Express): void => {
  app.use('/api/v1', router);
};
