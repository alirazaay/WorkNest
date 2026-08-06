import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/config/env.js';
import { hashToken, parseDuration, randomToken, signAccessToken, verifyAccessToken } from '../src/utils/tokens.js';

test('environment defaults are available for development', () => {
  assert.equal(env.API_PREFIX, '/api/v1');
  assert.equal(env.DB_PORT, 3306);
  assert.match(env.JWT_ACCESS_SECRET, /.{32,}/);
});

test('opaque tokens are random and hashed deterministically', () => {
  const first = randomToken();
  const second = randomToken();
  assert.notEqual(first, second);
  assert.equal(hashToken(first), hashToken(first));
  assert.notEqual(hashToken(first), first);
});

test('supported token durations convert to milliseconds', () => {
  assert.equal(parseDuration('15m'), 900000);
  assert.equal(parseDuration('7d'), 604800000);
});

test('access tokens contain the tenant and role claims', () => {
  const token = signAccessToken({ id: 7, tenantId: 3, role: 'admin' });
  const payload = verifyAccessToken(token);
  assert.equal(payload.sub, '7');
  assert.equal(payload.tenantId, 3);
  assert.equal(payload.role, 'admin');
});
