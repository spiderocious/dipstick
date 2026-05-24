import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { register as registerAuth } from '@features/auth/index.js';
import { register as registerBranches } from '@features/branches/index.js';
import { register as registerHealth } from '@features/health/index.js';
import { register as registerPricing } from '@features/pricing/index.js';
import { register as registerRoles } from '@features/roles/index.js';
import { register as registerShifts } from '@features/shifts/index.js';
import { register as registerStaff } from '@features/staff/index.js';
import { errorHandler } from '@middlewares/errorHandler.middleware.js';
import { requestIdMiddleware } from '@middlewares/requestId.middleware.js';
import { requestLogMiddleware } from '@middlewares/requestLog.middleware.js';

import { env } from './env.js';

const features = [
  registerHealth,
  registerAuth,
  registerRoles,
  registerStaff,
  registerPricing,
  registerShifts,
  registerBranches,
];

export const buildApp = (): express.Express => {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_BASE_URL === '*' ? true : env.WEB_BASE_URL,
      credentials: true,
    }),
  );

  app.use(requestIdMiddleware);
  app.use(requestLogMiddleware);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(compression());

  features.forEach((register) => register(app));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
  });

  app.use(errorHandler);

  return app;
};
