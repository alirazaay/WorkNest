import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const isDev = env.NODE_ENV === 'development';
const standard = { standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } } };

// In development, rate limiting is skipped entirely to avoid lockouts during testing.
export const apiRateLimit = rateLimit({ windowMs: env.RATE_LIMIT_WINDOW_MS, limit: env.RATE_LIMIT_MAX, skip: () => isDev, ...standard });
export const authRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  skip: () => isDev,
  ...standard
});
