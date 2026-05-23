import { Router, type IRouter } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { ResponseUtil } from '@lib/response.js';

import { LoginBody, RegisterBody, VerifyOtpBody } from './auth.schema.js';

const router: IRouter = Router();

// Stub endpoints — flesh out with a real auth.service.ts + auth.repo.ts.
// Kept here to demonstrate the feature shape. An Owner signs up, then must
// verify their phone via OTP before the workspace unlocks (Module 1).

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const body = RegisterBody.parse(req.body);
    return ResponseUtil.created(res, {
      user: { email: body.email, name: body.name, business_name: body.business_name, role: 'owner' },
      phone_verification_required: true,
    });
  }),
);

router.post(
  '/verify-otp',
  asyncHandler(async (req, res) => {
    const body = VerifyOtpBody.parse(req.body);
    return ResponseUtil.ok(res, {
      verified: true,
      phone: body.phone,
      tokens: { access_token: 'stub.access', refresh_token: 'stub.refresh' },
    });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = LoginBody.parse(req.body);
    return ResponseUtil.ok(res, {
      user: { email: body.email },
      tokens: { access_token: 'stub.access', refresh_token: 'stub.refresh' },
    });
  }),
);

router.post(
  '/refresh',
  asyncHandler(async (_req, res) =>
    ResponseUtil.ok(res, { access_token: 'stub.access', refresh_token: 'stub.refresh' }),
  ),
);

router.post(
  '/logout',
  asyncHandler(async (_req, res) => ResponseUtil.noContent(res)),
);

export default router;
