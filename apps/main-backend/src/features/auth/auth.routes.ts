import { Router, type IRouter } from 'express';

import { P } from '@dipstick/core';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requirePermission } from '@middlewares/authorize.middleware.js';

import { authController } from './auth.controller.js';

// Public auth surface, mounted at /api/v1/auth.
export const authRoutes: IRouter = Router();
authRoutes.post('/register', asyncHandler(authController.register));
authRoutes.post('/verify-otp', asyncHandler(authController.verifyOtp));
authRoutes.post('/resend-otp', asyncHandler(authController.resendOtp));
authRoutes.post('/login', asyncHandler(authController.login));
authRoutes.post('/refresh', asyncHandler(authController.refresh));
authRoutes.post('/logout', asyncHandler(authController.logout));

// Authenticated account surface, mounted at /api/v1 (so /me, /permissions, /org sit at root).
export const accountRoutes: IRouter = Router();
accountRoutes.get('/me', requireAuth, asyncHandler(authController.me));
accountRoutes.get('/permissions', requireAuth, asyncHandler(authController.permissions));
accountRoutes.patch(
  '/org',
  requireAuth,
  requirePermission(P.CAN_MANAGE_ORG),
  asyncHandler(authController.updateOrg),
);
