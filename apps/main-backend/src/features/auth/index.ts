import type { Express } from 'express';

import { accountRoutes, authRoutes } from './auth.routes.js';

export const register = (app: Express): void => {
  app.use('/api/v1/auth', authRoutes);
  // /me, /permissions, /org live at the API root, not under /auth.
  app.use('/api/v1', accountRoutes);
};
