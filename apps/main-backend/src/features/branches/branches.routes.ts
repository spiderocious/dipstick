import { Router, type IRouter } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { ResponseUtil } from '@lib/response.js';

const router: IRouter = Router();

// Module 1 — Branches, tanks, pumps. Stub list so the FE has a target.
// Real implementation adds branches.service.ts + branches.repo.ts +
// branches.schema.ts (zod). Money is stored in kobo. See mvp.md.

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    return ResponseUtil.ok(res, {
      items: [
        {
          id: 'brn_demo_ikeja',
          name: 'Ikeja Filling Station',
          city: 'Ikeja',
          state: 'Lagos',
          isArchived: false,
        },
        {
          id: 'brn_demo_awka',
          name: 'Awka Mega Station',
          city: 'Awka',
          state: 'Anambra',
          isArchived: false,
        },
      ],
    });
  }),
);

router.get(
  '/:branchId',
  asyncHandler(async (req, res) => {
    return ResponseUtil.ok(res, {
      id: req.params['branchId'],
      name: 'Ikeja Filling Station',
      city: 'Ikeja',
      state: 'Lagos',
      isArchived: false,
      tanks: [],
      pumps: [],
    });
  }),
);

export default router;
