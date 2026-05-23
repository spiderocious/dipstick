import pino, { type Logger, type LoggerOptions } from 'pino';

import { requestContext } from '@lib/http/requestContext.js';

import { env } from '../env.js';

const transport: LoggerOptions['transport'] =
  env.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname,service,env,method,path,statusCode,durationMs,ip,userAgent,route',
        },
      }
    : undefined;

const baseLogger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'dipstick-main-backend', env: env.NODE_ENV },
  ...(transport !== undefined ? { transport } : {}),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.token',
      '*.password',
      '*.token',
      '*.refresh_token',
      '*.secret',
    ],
    remove: true,
  },
});

const ctxFields = (): Record<string, unknown> => {
  const ctx = requestContext.get();
  if (!ctx) return {};
  const out: Record<string, unknown> = { requestId: ctx.requestId };
  if (ctx.userId) out['userId'] = ctx.userId;
  if (ctx.role) out['role'] = ctx.role;
  return out;
};

type LogMethod = (obj: object | string, msg?: string) => void;

const wrap = (level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'): LogMethod => {
  return (obj: object | string, msg?: string): void => {
    const ctx = ctxFields();
    if (typeof obj === 'string') {
      baseLogger[level]({ ...ctx }, obj);
    } else {
      baseLogger[level]({ ...ctx, ...obj }, msg);
    }
  };
};

export const logger = {
  trace: wrap('trace'),
  debug: wrap('debug'),
  info: wrap('info'),
  warn: wrap('warn'),
  error: wrap('error'),
  fatal: wrap('fatal'),
} satisfies Pick<Logger, 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'>;
