import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceCycleCreateSchema, performanceCycleUpdateSchema } from '../src/modules/performance/performance.schemas.js';

test('performance cycle schema accepts configurable cycle types and dates', () => {
  const result = performanceCycleCreateSchema.safeParse({ name: '2026 Annual Review', cycleType: 'annual', year: 2026, startDate: '2026-01-01', endDate: '2026-12-31' });
  assert.equal(result.success, true);
  assert.equal(result.data.status, undefined);
});

test('performance cycle schema rejects malformed dates and unknown statuses', () => {
  assert.equal(performanceCycleCreateSchema.safeParse({ name: 'Review', year: 2026, startDate: '01/01/2026', endDate: '2026-12-31' }).success, false);
  assert.equal(performanceCycleUpdateSchema.safeParse({ status: 'published' }).success, false);
});
