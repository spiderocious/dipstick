import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestCtx {
  requestId: string;
  method: string;
  path: string;
  ip: string | undefined;
  userAgent: string | undefined;
  startedAt: number;
  userId?: string;
  role?: string;
}

const storage = new AsyncLocalStorage<RequestCtx>();

export const requestContext = {
  run<T>(ctx: RequestCtx, fn: () => T): T {
    return storage.run(ctx, fn);
  },
  get(): RequestCtx | undefined {
    return storage.getStore();
  },
  getRequestId(): string | undefined {
    return storage.getStore()?.requestId;
  },
  set<K extends keyof RequestCtx>(key: K, value: RequestCtx[K]): void {
    const ctx = storage.getStore();
    if (ctx) ctx[key] = value;
  },
};
