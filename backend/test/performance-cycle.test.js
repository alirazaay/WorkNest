import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceCycleCreateSchema, performanceCycleUpdateSchema } from '../src/modules/performance/performance.schemas.js';
import { canTransitionCycle, validateCycleActivation } from '../src/modules/performance/performance.service.js';

test('performance cycle schema accepts configurable cycle types and dates', () => {
  const result = performanceCycleCreateSchema.safeParse({ name: '2026 Annual Review', cycleType: 'annual', year: 2026, startDate: '2026-01-01', endDate: '2026-12-31' });
  assert.equal(result.success, true);
  assert.equal(result.data.status, undefined);
});

test('performance cycle schema rejects malformed dates and unknown statuses', () => {
  assert.equal(performanceCycleCreateSchema.safeParse({ name: 'Review', year: 2026, startDate: '01/01/2026', endDate: '2026-12-31' }).success, false);
  assert.equal(performanceCycleUpdateSchema.safeParse({ status: 'published' }).success, false);
});

test('draft cycles can activate only through the supported lifecycle transition', () => {
  assert.equal(canTransitionCycle('draft', 'active'), true);
  assert.equal(canTransitionCycle('active', 'draft'), false);
  assert.equal(canTransitionCycle('completed', 'active'), false);
});

test('status-only lifecycle updates do not inherit create defaults', () => {
  assert.deepEqual(performanceCycleUpdateSchema.parse({ status: 'review' }), { status: 'review' });
});

test('cycle lifecycle allows only the ordered workflow transitions', () => {
  assert.equal(canTransitionCycle('draft', 'active'), true);
  assert.equal(canTransitionCycle('active', 'review'), true);
  assert.equal(canTransitionCycle('review', 'calibration'), true);
  assert.equal(canTransitionCycle('calibration', 'completed'), true);
  assert.equal(canTransitionCycle('draft', 'review'), false);
  assert.equal(canTransitionCycle('active', 'completed'), false);
  assert.equal(canTransitionCycle('review', 'active'), false);
  assert.equal(canTransitionCycle('completed', 'review'), false);
});

test('audit filters validate bounded tenant-scoped review fields', async () => {
  const { performanceAuditQuerySchema } = await import('../src/modules/performance/performance.schemas.js');
  assert.deepEqual(performanceAuditQuerySchema.parse({ cycleId: '9', employeeId: '15012', actorUserId: '1', action: 'performance_', fromDate: '2026-01-01', toDate: '2026-12-31' }), { cycleId: 9, employeeId: 15012, actorUserId: 1, action: 'performance_', fromDate: '2026-01-01', toDate: '2026-12-31' });
  assert.equal(performanceAuditQuerySchema.safeParse({ fromDate: '2026-12-31', toDate: '2026-01-01' }).success, false);
});

test('cycle activation rejects missing or incomplete active templates', () => {
  assert.throws(() => validateCycleActivation(null), error => error.code === 'CYCLE_ACTIVATION_TEMPLATE_REQUIRED' && error.statusCode === 422);
  assert.throws(() => validateCycleActivation({ criteria: [{ weight: 60 }] }), error => error.code === 'CYCLE_ACTIVATION_WEIGHTS_INCOMPLETE');
  assert.doesNotThrow(() => validateCycleActivation({ criteria: [{ weight: 60 }, { weight: 40 }] }));
});
