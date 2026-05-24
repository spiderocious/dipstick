import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8091),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

  APP_BASE_URL: z.string().url(),
  WEB_BASE_URL: z.string().url(),

  // Persistence. Mongo today; the repo layer keeps this swappable.
  MONGO_URL: z.string().default('mongodb://127.0.0.1:27017'),
  MONGO_DB_NAME: z.string().default('dipstick'),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // OTP lifecycle (Module 1).
  OTP_TTL_SECONDS: z.coerce.number().default(600),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),

  // Verification policy: which channel(s) a new owner must verify before the workspace
  // unlocks (tokens issued). `none` auto-verifies at sign-up (no OTP); `both` requires email
  // AND phone. Default `phone` preserves the historical behaviour. A required channel whose
  // value is absent at sign-up is treated as already satisfied (can't verify what isn't given).
  AUTH_VERIFICATION: z.enum(['none', 'email', 'phone', 'both']).default('phone'),
});

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env: Env = parsed.data;
