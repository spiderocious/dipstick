import { createServer, type Server } from 'node:http';

import { logger } from '@lib/logger.js';

import { buildApp } from './app.js';
import { closeDb, connectDb } from './db/client.js';
import { ensureIndexes } from './db/indexes.js';
import { env } from './env.js';

const startHttpApp = async (): Promise<Server> => {
  await connectDb();
  await ensureIndexes();

  const app = buildApp();
  const server = createServer(app);
  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'main-backend listening');
  });
  return server;
};

const serverPromise = startHttpApp();

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'shutting down gracefully');
  const server = await serverPromise;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await closeDb();
  process.exit(0);
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

serverPromise.catch((err) => {
  logger.error({ err }, 'failed to start main-backend');
  process.exit(1);
});
