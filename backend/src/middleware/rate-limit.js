import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const standard = { standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } } };
export const apiRateLimit = rateLimit({ windowMs: env.RATE_LIMIT_WINDOW_MS, limit: env.RATE_LIMIT_MAX, ...standard });
export const authRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  // Keep production protection while avoiding a long lockout during local testing.
  limit: env.NODE_ENV === 'development' ? Math.max(env.AUTH_RATE_LIMIT_MAX, 100) : env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  ...standard
});
