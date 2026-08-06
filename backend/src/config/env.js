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
  LOG_LEVEL: z.string().default('info')
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
