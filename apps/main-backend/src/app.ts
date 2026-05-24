import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { register as registerAudit } from '@features/audit/index.js';
import { register as registerAuth } from '@features/auth/index.js';
import { register as registerBranches } from '@features/branches/index.js';
import { register as registerDeliveries } from '@features/deliveries/index.js';
import { register as registerExpenses } from '@features/expenses/index.js';
import { register as registerHealth } from '@features/health/index.js';
import { register as registerNotes } from '@features/notes/index.js';
import { register as registerNotifications } from '@features/notifications/index.js';
import { register as registerPricing } from '@features/pricing/index.js';
import { register as registerRollup } from '@features/rollup/index.js';
import { register as registerRoles } from '@features/roles/index.js';
import { register as registerShifts } from '@features/shifts/index.js';
import { register as registerStaff } from '@features/staff/index.js';
import { errorHandler } from '@middlewares/errorHandler.middleware.js';
import { requestIdMiddleware } from '@middlewares/requestId.middleware.js';
import { requestLogMiddleware } from '@middlewares/requestLog.middleware.js';

import { ERROR_CODE } from '@shared/constants/error-codes.js';

// Registration order: routers that mount specific sub-paths under /api/v1/branches
// (staff, pricing, shifts, deliveries, audit) come BEFORE the branches router, whose
// /:branchId catch-all would otherwise shadow nothing (different segment counts) but we
// keep specific-before-parameterized as the rule. Root-level routers (rollup, notifications,
// notes at /api/v1) are independent.
const features = [
  registerHealth,
  registerAuth,
  registerRoles,
  registerRollup,
  registerNotifications,
  registerNotes,
  registerStaff,
  registerPricing,
  registerShifts,
  registerDeliveries,
  registerExpenses,
  registerAudit,
  registerBranches,
];

export const buildApp = (): express.Express => {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: "*",
      credentials: true,
    }),
  );

  app.use(requestIdMiddleware);
  app.use(requestLogMiddleware);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(compression());

  features.forEach((register) => register(app));

  // Unmatched route → flat error contract (1004).
  app.use((_req, res) => {
    res
      .status(404)
      .json({ errorCode: ERROR_CODE.NOT_FOUND, errorMessage: 'Route not found', type: 'not_found_error' });
  });

  app.use(errorHandler);

  return app;
};
