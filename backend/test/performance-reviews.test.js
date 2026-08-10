import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceReviewCreateSchema, performanceReviewQuerySchema } from '../src/modules/performance/performance.schemas.js';

test('review validation requires unique criteria and bounded raw scores', () => {
  const valid = performanceReviewCreateSchema.safeParse({ cycleId: 1, employeeId: 2, reviewType: 'manager', scores: [{ criterionId: 3, rawScore: 88, reviewerComment: 'Strong delivery' }] });
  assert.equal(valid.success, true);
  const duplicate = performanceReviewCreateSchema.safeParse({ cycleId: 1, employeeId: 2, reviewType: 'manager', scores: [{ criterionId: 3, rawScore: 88 }, { criterionId: 3, rawScore: 90 }] });
  assert.equal(duplicate.success, false);
  assert.equal(performanceReviewCreateSchema.safeParse({ cycleId: 1, employeeId: 2, reviewType: 'manager', scores: [{ criterionId: 3, rawScore: 101 }] }).success, false);
});

test('review query filters are typed and constrained', () => {
  assert.deepEqual(performanceReviewQuerySchema.parse({ cycleId: '4', reviewType: 'self', status: 'submitted' }), { cycleId: 4, reviewType: 'self', status: 'submitted' });
});
