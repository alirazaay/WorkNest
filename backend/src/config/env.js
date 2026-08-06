import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  HOST: z.string().default('127.0.0.1'),
  API_PREFIX: z.string().default('/api/v1'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().default('worknest'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_LOG_SQL: z.enum(['true', 'false']).default('false'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_POOL_MIN: z.coerce.number().int().min(0).default(0),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  LOG_LEVEL: z.string().default('info'),
  JWT_ACCESS_SECRET: z.string().min(32).default('development-access-secret-change-me-32chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32).default('development-refresh-secret-change-me-32chars'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  REFRESH_COOKIE_NAME: z.string().default('worknest_refresh'),
  RESET_TOKEN_EXPIRES_MINUTES: z.coerce.number().int().positive().default(30),
  INVITE_TOKEN_EXPIRES_HOURS: z.coerce.number().int().positive().default(72),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  APP_VERSION: z.string().default('0.1.0')
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  DB_LOG_SQL: parsed.data.DB_LOG_SQL === 'true'
};
