import type { Express } from 'express';

import authRoutes from './auth.routes.js';

export const register = (app: Express): void => {
  app.use('/api/v1/auth', authRoutes);
};
