import test from 'node:test';
import assert from 'node:assert/strict';
import { authorize } from '../src/middleware/authorize.js';
import { tenantContext } from '../src/middleware/tenant-context.js';

test('authorization rejects roles outside the allowed set', () => {
  let error;
  authorize('admin')({ auth: { role: 'employee' } }, {}, (value) => { error = value; });
  assert.equal(error.code, 'FORBIDDEN');
  assert.equal(error.statusCode, 403);
});

test('authorization allows an explicitly permitted role', () => {
  let called = false;
  authorize('super_admin')({ auth: { role: 'super_admin' } }, {}, () => { called = true; });
  assert.equal(called, true);
});

test('tenant context never trusts a tenant ID from request input', () => {
  const req = { body: { tenantId: 999 }, auth: null };
  tenantContext(req, {}, () => {});
  assert.equal(req.tenantId, null);
});
