import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function parseDuration(value) {
  const match = String(value).match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match) throw new Error(`Unsupported duration: ${value}`);
  const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(match[1]) * units[match[2].toLowerCase()];
}

export function signAccessToken(user) {
  return jwt.sign({
    sub: String(user.id),
    tenantId: user.tenantId ?? null,
    role: user.role
  }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
}

export function signRefreshToken(user, sessionId) {
  return jwt.sign({
    sub: String(user.id),
    sessionId,
    tokenType: 'refresh'
  }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}
