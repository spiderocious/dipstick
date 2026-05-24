import { Router, type Express, type IRouter } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { requireAuth } from '@middlewares/auth.middleware.js';

import { notificationsController } from './notifications.controller.js';

const router: IRouter = Router();

// Notifications are the caller's own — no special permission, just authentication.
router.use(requireAuth);
router.get('/', asyncHandler(notificationsController.list));
router.post('/:id/read', asyncHandler(notificationsController.markRead));

export const register = (app: Express): void => {
  app.use('/api/v1/notifications', router);
};
