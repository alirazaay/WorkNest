import test from 'node:test';
import assert from 'node:assert/strict';
import { AuditLog } from '../src/database/models/AuditLog.js';

test('audit log maps createdAt to the underscored database column', () => {
  assert.equal(AuditLog.rawAttributes.createdAt.field, 'created_at');
  assert.equal(AuditLog.options.timestamps, false);
});
