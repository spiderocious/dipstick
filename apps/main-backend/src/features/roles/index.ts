import { Router, type Express, type IRouter } from 'express';

import { P } from '@dipstick/core';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requirePermission } from '@middlewares/authorize.middleware.js';

import { rolesController } from './roles.controller.js';

const router: IRouter = Router();

router.use(requireAuth);
router.get('/', requirePermission(P.CAN_MANAGE_ROLES, P.CAN_VIEW_STAFF), asyncHandler(rolesController.list));
router.post('/', requirePermission(P.CAN_MANAGE_ROLES), asyncHandler(rolesController.create));
router.patch('/:roleId', requirePermission(P.CAN_MANAGE_ROLES), asyncHandler(rolesController.update));
router.delete('/:roleId', requirePermission(P.CAN_MANAGE_ROLES), asyncHandler(rolesController.remove));

export const register = (app: Express): void => {
  app.use('/api/v1/roles', router);
};
