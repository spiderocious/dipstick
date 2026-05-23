import type { Express } from 'express';

import branchesRoutes from './branches.routes.js';

export const register = (app: Express): void => {
  app.use('/api/v1/branches', branchesRoutes);
};
