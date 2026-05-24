import { MongoClient, type Db } from 'mongodb';

import { env } from '../env.js';
import { logger } from '@lib/logger.js';

// The ONLY place a MongoClient is created. Everything downstream takes a `Db` (or, better,
// a repository). No other module imports `mongodb` except `*.repo.mongo.ts` files.

let client: MongoClient | null = null;
let db: Db | null = null;

export const connectDb = async (): Promise<Db> => {
  if (db) return db;
  client = new MongoClient(env.MONGO_URL, {
    // Keep the wire-protocol surface small and predictable across DB swaps.
    ignoreUndefined: true,
  });
  await client.connect();
  db = client.db(env.MONGO_DB_NAME);
  logger.info({ dbName: env.MONGO_DB_NAME }, 'mongo connected');
  return db;
};

export const getDb = (): Db => {
  if (!db) throw new Error('Database not connected. Call connectDb() at boot.');
  return db;
};

export const getClient = (): MongoClient => {
  if (!client) throw new Error('Database not connected. Call connectDb() at boot.');
  return client;
};

export const closeDb = async (): Promise<void> => {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
};
