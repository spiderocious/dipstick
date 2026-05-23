import { Router, type IRouter } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { ResponseUtil } from '@lib/response.js';

import { env } from '../../env.js';

const router: IRouter = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    return ResponseUtil.ok(res, {
      status: 'ok',
      service: 'main-backend',
      env: env.NODE_ENV,
      time: new Date().toISOString(),
    });
  }),
);

export default router;
